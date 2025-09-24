import { Router } from 'express';
import { stripeService } from './service';

const router = Router();

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await stripeService.getPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Price ID and User ID are required' });
    }

    const session = await stripeService.createCheckoutSession(priceId, userId);
    res.json(session);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription status
router.get('/subscription-status/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const status = await stripeService.getSubscriptionStatus(customerId);
    res.json(status);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    const result = await stripeService.handleWebhook(payload, signature);
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

export default router;