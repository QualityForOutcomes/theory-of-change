const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const { price_id, user_id, success_url, cancel_url } = req.body;

    if (!price_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Price ID and User ID are required'
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: success_url || `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${req.headers.origin}/plans?status=cancelled`,
      metadata: {
        user_id: user_id.toString()
      },
      subscription_data: {
        metadata: {
          user_id: user_id.toString()
        }
      },
      customer_creation: 'always',
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session'
    });
  }
};