# Deployment Guide

This guide covers how to deploy your application while properly handling environment variables and secrets.

## 🔐 Environment Variables & Security

### Local Development Setup

1. **Backend (stripe-backend)**:
   ```bash
   cd stripe-backend
   cp .env.example .env
   # Edit .env and add your actual Stripe secret key
   ```

2. **Frontend (my-app)**:
   ```bash
   cd my-app
   cp .env.example .env
   # Edit .env and set REACT_APP_PAYMENT_API_BASE=http://localhost:3003
   ```

### Production Deployment

#### Option 1: Vercel (Recommended for Backend)

1. **Deploy Backend**:
   ```bash
   cd stripe-backend
   vercel --prod
   
   # Set environment variables
   vercel env add STRIPE_SECRET_KEY
   # Enter your production Stripe secret key when prompted
   ```

2. **Deploy Frontend**:
   ```bash
   cd my-app
   npm run build
   
   # Update .env for production
   REACT_APP_PAYMENT_API_BASE=https://your-backend.vercel.app
   
   # Deploy to your preferred hosting (Vercel, Netlify, etc.)
   ```

#### Option 2: Other Hosting Platforms

**For Backend**:
- Set `STRIPE_SECRET_KEY` in your hosting platform's environment variables
- Set `NODE_ENV=production`
- Set `PORT` if required by your hosting platform

**For Frontend**:
- Set `REACT_APP_PAYMENT_API_BASE` to your deployed backend URL
- Build with `npm run build`
- Deploy the `build` folder

## 🚨 Security Checklist

### Before Pushing to Git:

- [ ] `.env` files are in `.gitignore`
- [ ] No secrets in source code
- [ ] `.env.example` files have placeholder values only
- [ ] All sensitive data uses environment variables

### For Production:

- [ ] Use production Stripe keys (starts with `sk_live_`)
- [ ] Enable HTTPS for all endpoints
- [ ] Set proper CORS origins
- [ ] Use secure environment variable management

## 🔄 Workflow for Team Development

1. **Initial Setup**:
   ```bash
   git clone <repository>
   cd stripe-backend && cp .env.example .env
   cd ../my-app && cp .env.example .env
   # Add your development keys to .env files
   ```

2. **Adding New Environment Variables**:
   - Add to `.env.example` with placeholder values
   - Update documentation
   - Inform team members to update their local `.env`

3. **Production Updates**:
   - Update environment variables in hosting platform
   - Test in staging environment first
   - Deploy to production

## 📝 Environment Variables Reference

### Backend (.env)
```
STRIPE_SECRET_KEY=sk_test_... (development) or sk_live_... (production)
PORT=3003
NODE_ENV=development|production
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com
```

### Frontend (.env)
```
REACT_APP_PAYMENT_API_BASE=http://localhost:3003 (development) or https://your-backend.com (production)
```

## 🆘 Troubleshooting

### "No API key provided" Error:
- Check if `.env` file exists in stripe-backend
- Verify `STRIPE_SECRET_KEY` is set correctly
- Restart the backend server after changing environment variables

### CORS Errors:
- Update `ALLOWED_ORIGINS` in backend `.env`
- Ensure frontend URL is included in CORS settings

### Build Errors:
- Check if all required environment variables are set
- Verify `.env.example` matches actual `.env` structure