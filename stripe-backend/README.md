# Stripe Backend - Serverless Functions

This directory contains serverless functions for handling Stripe payment operations.

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual Stripe secret key
# Get your keys from: https://dashboard.stripe.com/apikeys
```

3. Update `.env` file with your Stripe secret key:
```
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key_here
```

4. Start the development server:
```bash
npm start
```

### Production Deployment (Vercel)

1. Install Vercel CLI (if not already installed):
```bash
npm install -g vercel
```

2. Set up environment variables in Vercel:
```bash
vercel env add STRIPE_SECRET_KEY
```
Enter your Stripe secret key when prompted (starts with `sk_test_` for test mode or `sk_live_` for live mode).

3. Deploy to Vercel:
```bash
vercel --prod
```

### ⚠️ Security Note

- Never commit `.env` files to Git
- Always use `.env.example` for sharing configuration templates
- Use environment variables for all sensitive data

## Deployment

1. Deploy to Vercel:
```bash
vercel --prod
```

2. Update your frontend environment variables:
   - Update `REACT_APP_PAYMENT_API_BASE` in your React app to point to your deployed Vercel URL
   - Example: `https://your-stripe-backend.vercel.app`

## API Endpoints

### POST /api/payment/cancel-subscription

Cancels a Stripe subscription.

**Request Body:**
```json
{
  "user_id": "12345",
  "subscription_id": "sub_1234567890" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription canceled successfully",
  "data": {
    "subscription_id": "sub_1234567890",
    "status": "canceled",
    "canceled_at": 1234567890
  }
}
```

## Important Notes

1. **Stripe Secret Key**: Make sure to use your actual Stripe secret key in the environment variables.

2. **User ID Mapping**: The current implementation searches for subscriptions by user_id in metadata. Make sure your subscription creation process stores the user_id in the subscription metadata.

3. **Testing**: Use Stripe test mode keys for development and testing.

4. **Security**: Never expose your Stripe secret key in client-side code.

## Local Development

Run locally with Vercel dev:
```bash
vercel dev
```

This will start a local development server that mimics the Vercel serverless environment.