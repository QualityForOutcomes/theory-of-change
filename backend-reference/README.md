# Backend Reference

Serverless backend functions for authentication, user management, subscriptions, and newsletters.

## Environment Variables

Configure these in your hosting provider (e.g., Vercel) and local `.env.local`:

### Supabase
```
TOC_SUPABASE_URL=<your-supabase-url>
TOC_SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Email (Newsletter + Password Reset)
```
GMAIL_USER=<your-gmail-address>
GMAIL_APP_PASSWORD=<gmail-app-password>
GMAIL_SENDER_NAME=Quality for Outcomes
```
- Use a Gmail App Password (not your account password). Create at: https://myaccount.google.com/apppasswords
- Do not expose these values in client-side apps.

### Email (Bulk Campaigns via SendGrid)
```
SENDGRID_API_KEY=<your-sendgrid-api-key>
NEWSLETTER_FROM_EMAIL=<verified-sender-email>
NEWSLETTER_FROM_NAME=Quality for Outcomes
```
- Use a verified sender domain in SendGrid for deliverability.
- Preferred for bulk newsletters; keeps Gmail for transactional welcome emails.

## Newsletter Welcome Emails

- When a user ticks `Subscribe to our newsletter` during registration or later in preferences, we:
  - Create a record in `UserNewsLetterSubs`.
  - Send a welcome email using `NewsletterEmailService`.
- Email sending is non-blocking and failures do not stop registration.

## Newsletter Campaigns (Admin)

- Endpoint: `POST /api/newsletter/SendCampaign`
- Auth: Requires JWT (admin)
- Body: `{ "subject": string, "html": string }`
- Behavior: Fetches all subscribers and sends in batches via SendGrid.
- Ensure `SENDGRID_API_KEY` and sender domain are configured and verified in SendGrid.

## Deploy

```bash
vercel --prod
```

Ensure environment variables are added in the dashboard: Settings → Environment Variables.
