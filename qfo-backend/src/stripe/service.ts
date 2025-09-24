import Stripe from 'stripe';
import { env } from '../env';

// Initialize Stripe with secret key
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  stripePriceId: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'aud',
    interval: 'month',
    features: [
      'Basic project management',
      'Up to 3 projects',
      'Email support'
    ],
    stripePriceId: ''
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'aud',
    interval: 'month',
    features: [
      'Advanced project management',
      'Unlimited projects',
      'Priority support',
      'Advanced analytics',
      'Team collaboration'
    ],
    stripePriceId: env.STRIPE_PRO_PRICE_ID
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 59,
    currency: 'aud',
    interval: 'month',
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'Advanced reporting',
      'White-label options'
    ],
    stripePriceId: env.STRIPE_PREMIUM_PRICE_ID
  }
};

export class StripeService {
  async getPlans(): Promise<SubscriptionPlan[]> {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  async createCheckoutSession(priceId: string, userId: string) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${env.CORS_ORIGIN}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.CORS_ORIGIN}/subscription/plans`,
        metadata: {
          userId: userId,
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async getSubscriptionStatus(customerId: string) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        return {
          isActive: true,
          planId: subscription.items.data[0].price.id,
          currentPeriodEnd: subscription.current_period_end,
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  }

  async handleWebhook(payload: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'checkout.session.completed':
          // Handle successful payment
          console.log('Payment successful:', event.data.object);
          break;
        case 'invoice.payment_succeeded':
          // Handle successful subscription payment
          console.log('Subscription payment successful:', event.data.object);
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          console.log('Subscription cancelled:', event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error('Webhook signature verification failed');
    }
  }
}

export const stripeService = new StripeService();