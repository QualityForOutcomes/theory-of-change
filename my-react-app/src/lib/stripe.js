export const SUBSCRIPTION_PLANS = {
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
    stripePriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || ''
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
    stripePriceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID || ''
  }
};

export const stripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  paymentLink: import.meta.env.VITE_STRIPE_PAYMENT_LINK || ''
};