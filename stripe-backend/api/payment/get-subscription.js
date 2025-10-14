const Stripe = require('stripe');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure Stripe is configured before proceeding
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || !String(stripeSecretKey).trim()) {
    return res.status(500).json({
      success: false,
      message: 'Payment server is not configured. Missing STRIPE_SECRET_KEY.'
    });
  }
  // Initialize Stripe client only after validating the secret key
  const stripe = Stripe(stripeSecretKey);

  try {
    const { subscription_id, session_id } = req.method === 'GET' ? req.query : req.body;

    if (!subscription_id && !session_id) {
      return res.status(400).json({
        success: false,
        message: 'Provide either subscription_id or session_id'
      });
    }

    let subId = subscription_id;
    if (!subId && session_id) {
      // If a checkout session id is provided, resolve to subscription id
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (!session.subscription) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found for the provided session_id'
        });
      }
      subId = session.subscription;
    }

    const subscription = await stripe.subscriptions.retrieve(subId);

    // Extract minimal fields useful to the frontend
    const item = subscription.items?.data?.[0];
    const planId = item?.price?.id || item?.plan?.id || null;
    const interval = item?.price?.recurring?.interval || item?.plan?.interval || null;
    const amount = item?.price?.unit_amount || item?.plan?.amount || null;

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
        planId,
        interval,
        amount,
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    const code = error.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: error.message || 'Failed to retrieve subscription'
    });
  }
};