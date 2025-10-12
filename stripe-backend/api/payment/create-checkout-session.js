const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(stripeSecret);
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { price_id, user_id, email, success_url, cancel_url } = req.body;

    // Basic request logging to trace redirect issues and duplicates
    console.log('➡️  create-checkout-session request', {
      origin: req.headers && req.headers.origin,
      price_id,
      user_id,
      email,
      success_url,
      cancel_url,
    });

    if (!stripeSecret) {
      return res.status(500).json({
        success: false,
        message: 'Payment server is not configured. Missing STRIPE_SECRET_KEY.',
      });
    }

    if (!price_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Price ID and User ID are required'
      });
    }

    // Derive frontend origin (prefer success_url host, then FRONTEND_ORIGIN, then request Origin header, finally localhost:3000)
    let frontendOrigin = 'http://localhost:3000';
    try {
      if (success_url) {
        const su = new URL(success_url);
        frontendOrigin = `${su.protocol}//${su.host}`; // e.g., http://localhost:3000
      } else if (process.env.FRONTEND_ORIGIN) {
        frontendOrigin = process.env.FRONTEND_ORIGIN;
      } else if (req.headers && req.headers.origin) {
        frontendOrigin = req.headers.origin;
      }
    } catch (e) {
      // If parsing fails, fall back to env or origin header
      frontendOrigin = (process.env.FRONTEND_ORIGIN || (req.headers && req.headers.origin) || 'http://localhost:3000');
    }
    console.log('🔗 Resolved frontendOrigin for redirects:', frontendOrigin);

    // Helper to ensure provided URLs always point to the frontend origin (never the backend)
    const normalizeUrlToFrontend = (url, fallbackPath = '/subscription-success') => {
      try {
        const base = new URL(frontendOrigin);
        // If url is relative or missing, start from fallbackPath
        const candidate = url ? new URL(url, base) : new URL(fallbackPath, base);
        // Force origin to frontend
        candidate.protocol = base.protocol;
        candidate.host = base.host; // includes hostname:port
        return candidate.toString();
      } catch (e) {
        // Fallback to a minimal valid URL on the frontend
        return `${frontendOrigin}${fallbackPath}`;
      }
    };

    // Resolve or create a Stripe Customer for this user to lock email editing on Checkout
    // Priority: search by metadata user_id, then by email, with robust fallbacks; finally create if missing
    let customer = null;
    try {
      // Try search by metadata user_id
      const byMeta = await stripe.customers.search({
        query: `metadata['user_id']:'${user_id.toString()}'`
      });
      if (byMeta && byMeta.data && byMeta.data.length > 0) {
        customer = byMeta.data[0];
      }
    } catch (e) {
      // Ignore search errors and continue
      console.warn('Customer search by metadata failed, will try by email:', e.message);
    }

    if (!customer && email) {
      try {
        const byEmail = await stripe.customers.search({
          query: `email:'${email}'`
        });
        if (byEmail && byEmail.data && byEmail.data.length > 0) {
          customer = byEmail.data[0];
        }
        // Fallback: list and filter by email if search returns no results or not supported
        if (!customer) {
          try {
            const list = await stripe.customers.list({ limit: 100 });
            const match = list.data.find(c => (c.email || '').toLowerCase() === (email || '').toLowerCase());
            if (match) customer = match;
          } catch (listErr) {
            console.warn('Customer list fallback failed:', listErr.message);
          }
        }
      } catch (e) {
        console.warn('Customer search by email failed, will create new customer if needed:', e.message);
      }
    }

    if (!customer) {
      // Create a new customer with provided email if available
      customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { user_id: user_id.toString() }
      });
    } else {
      // Ensure Stripe Customer email matches logged-in email to lock Checkout email field
      try {
        const cust = await stripe.customers.retrieve(customer.id);
        const currentEmail = (cust && cust.email) || undefined;
        if (email && (!currentEmail || currentEmail.toLowerCase() !== email.toLowerCase())) {
          await stripe.customers.update(customer.id, { email });
          customer.email = email; // reflect update locally
        }
        // Also ensure user_id metadata is present
        const meta = (cust && cust.metadata) || {};
        if (String(meta.user_id || '') !== user_id.toString()) {
          await stripe.customers.update(customer.id, { metadata: { ...meta, user_id: user_id.toString() } });
        }
      } catch (custUpdateErr) {
        console.warn('Failed to align customer email/metadata:', custUpdateErr.message);
      }
    }

    // If customer already has an active subscription, avoid duplicate subscriptions
    try {
      const existingSubs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });
      if (existingSubs && existingSubs.data && existingSubs.data.length > 0) {
        // If the existing subscription is a free-tier (unit_amount == 0 or matches STRIPE_FREE_PRICE_ID),
        // do NOT redirect to Billing Portal; proceed with Checkout to upgrade.
        const sub = existingSubs.data[0];
        const FREE_PRICE_ID = process.env.STRIPE_FREE_PRICE_ID || null;
        const isFreeTier = Array.isArray(sub.items?.data) && sub.items.data.some((item) => {
          const price = item?.price;
          if (!price) return false;
          const isZeroAmount = typeof price.unit_amount === 'number' && price.unit_amount === 0;
          const matchesFreeId = FREE_PRICE_ID ? price.id === FREE_PRICE_ID : false;
          return isZeroAmount || matchesFreeId;
        });

        if (!isFreeTier) {
          // Create a Billing Portal session for plan changes / cancellation
          const returnUrl = success_url || `${frontendOrigin}/project`;
          const portal = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnUrl,
          });
          return res.status(200).json({
            success: true,
            url: portal.url,
            message: 'Existing paid subscription detected; redirecting to Billing Portal',
          });
        }
        // Free-tier subscription detected — continue to Checkout creation below.
      }
      // Also check trialing subscriptions
      try {
        const trialingSubs = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'trialing',
          limit: 1,
        });
        if (trialingSubs && trialingSubs.data && trialingSubs.data.length > 0) {
          // Only redirect to portal for trialing subscriptions if they are paid tiers.
          const sub = trialingSubs.data[0];
          const FREE_PRICE_ID = process.env.STRIPE_FREE_PRICE_ID || null;
          const isFreeTier = Array.isArray(sub.items?.data) && sub.items.data.some((item) => {
            const price = item?.price;
            if (!price) return false;
            const isZeroAmount = typeof price.unit_amount === 'number' && price.unit_amount === 0;
            const matchesFreeId = FREE_PRICE_ID ? price.id === FREE_PRICE_ID : false;
            return isZeroAmount || matchesFreeId;
          });
          if (!isFreeTier) {
            const returnUrl = success_url || `${frontendOrigin}/project`;
            const portal = await stripe.billingPortal.sessions.create({
              customer: customer.id,
              return_url: returnUrl,
            });
            return res.status(200).json({
              success: true,
              url: portal.url,
              message: 'Trialing paid subscription detected; redirecting to Billing Portal',
            });
          }
          // Free-tier trial — continue with Checkout creation.
        }
      } catch (trialErr) {
        console.warn('Trialing subscription check failed, proceeding with Checkout:', trialErr.message);
      }
    } catch (portalErr) {
      console.warn('Subscription check/portal session failed, proceeding with Checkout:', portalErr.message);
    }

    // Compute effective redirect URLs, ensuring they target the frontend
    const effectiveSuccessUrl = normalizeUrlToFrontend(
      success_url || `${frontendOrigin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      '/subscription-success'
    );
    const effectiveCancelUrl = normalizeUrlToFrontend(
      cancel_url || `${frontendOrigin}/plans?status=cancelled`,
      '/plans?status=cancelled'
    );

    // Create checkout session
    // Build a stable idempotency key that varies with meaningful parameters to avoid Stripe
    // complaints when the same user/price is used with different URLs or customer contexts.
    const idemKeyBase = JSON.stringify({
      user_id: user_id.toString(),
      price_id: String(price_id),
      success_url: effectiveSuccessUrl,
      cancel_url: effectiveCancelUrl,
      customer_id: customer.id,
    });
    const idemKey = 'checkout_' + crypto.createHash('sha256').update(idemKeyBase).digest('hex').slice(0, 24);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Only include supported placeholder for Checkout Session ID.
      // The subscription ID must be resolved server-side using the session_id.
      success_url: effectiveSuccessUrl,
      cancel_url: effectiveCancelUrl,
      // Attach the resolved customer to lock email field on Checkout
      customer: customer.id,
      // Do not set customer_email to avoid editable email; rely on attached customer
      client_reference_id: user_id.toString(),
      metadata: {
        user_id: user_id.toString()
      },
      subscription_data: {
        metadata: {
          user_id: user_id.toString()
        }
      },
    }, { idempotencyKey: idemKey });

    console.log('✅ checkout session created', {
      session_id: session.id,
      url: session.url,
      success_url: session.success_url,
      cancel_url: session.cancel_url,
      customer: session.customer,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      session_id: session.id,
      effective_success_url: session.success_url,
      effective_cancel_url: session.cancel_url,
      message: 'Checkout session created'
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};