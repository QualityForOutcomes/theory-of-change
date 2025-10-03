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
    const { user_id, subscription_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // If subscription_id is provided, cancel that specific subscription
    if (subscription_id) {
      try {
        let actualSubscriptionId = subscription_id;
        
        // Check if the provided ID is a Checkout Session ID (starts with 'cs_')
        if (subscription_id.startsWith('cs_')) {
          console.log('Checkout Session ID detected, retrieving subscription...');
          
          // Retrieve the checkout session to get the subscription ID
          const checkoutSession = await stripe.checkout.sessions.retrieve(subscription_id);
          
          if (!checkoutSession.subscription) {
            return res.status(400).json({
              success: false,
              message: 'No subscription found for this checkout session'
            });
          }
          
          actualSubscriptionId = checkoutSession.subscription;
          console.log('Found subscription ID:', actualSubscriptionId);
        }
        
        // First, check the current status of the subscription
        const currentSubscription = await stripe.subscriptions.retrieve(actualSubscriptionId);
        
        // If already canceled, return appropriate message
        if (currentSubscription.status === 'canceled') {
          return res.status(200).json({
            success: true,
            message: 'Subscription was already canceled',
            data: {
              subscription_id: currentSubscription.id,
              status: currentSubscription.status,
              canceled_at: currentSubscription.canceled_at,
              checkout_session_id: subscription_id.startsWith('cs_') ? subscription_id : null,
              already_canceled: true
            }
          });
        }
        
        // Cancel the subscription if it's still active
        const subscription = await stripe.subscriptions.cancel(actualSubscriptionId);
        
        return res.status(200).json({
          success: true,
          message: 'Subscription canceled successfully',
          data: {
            subscription_id: subscription.id,
            status: subscription.status,
            canceled_at: subscription.canceled_at,
            checkout_session_id: subscription_id.startsWith('cs_') ? subscription_id : null,
            already_canceled: false
          }
        });
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        return res.status(400).json({
          success: false,
          message: `Failed to cancel subscription: ${stripeError.message}`
        });
      }
    }

    // If no subscription_id provided, find and cancel all active subscriptions for the user
    try {
      // Search for subscriptions by customer metadata or email
      // Note: You'll need to store customer ID mapping in your database
      // For now, we'll search by metadata
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: 'active'
      });

      // Filter subscriptions that belong to this user
      // This assumes you store user_id in subscription metadata
      const userSubscriptions = subscriptions.data.filter(sub => 
        sub.metadata && sub.metadata.user_id === user_id.toString()
      );

      if (userSubscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active subscriptions found for this user'
        });
      }

      // Cancel all user subscriptions
      const canceledSubscriptions = [];
      for (const subscription of userSubscriptions) {
        try {
          const canceled = await stripe.subscriptions.cancel(subscription.id);
          canceledSubscriptions.push({
            subscription_id: canceled.id,
            status: canceled.status,
            canceled_at: canceled.canceled_at
          });
        } catch (cancelError) {
          console.error(`Failed to cancel subscription ${subscription.id}:`, cancelError);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Successfully canceled ${canceledSubscriptions.length} subscription(s)`,
        data: {
          canceled_subscriptions: canceledSubscriptions
        }
      });

    } catch (stripeError) {
      console.error('Stripe search error:', stripeError);
      return res.status(500).json({
        success: false,
        message: `Failed to search for subscriptions: ${stripeError.message}`
      });
    }

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};