# Stripe Functions — Paused

These serverless functions are temporarily paused to stay within the
Vercel Hobby plan limit of **12 serverless functions**.

Vercel treats any directory prefixed with `_` inside `api/` as a helper
module directory, so files here are **not deployed** as serverless endpoints.

## How to re-enable

1. Move the 3 files back to `api/`:
   ```bash
   mv api/_stripe-paused/create-checkout-session.js api/
   mv api/_stripe-paused/create-portal-session.js api/
   mv api/_stripe-paused/stripe-webhook.js api/
   ```
2. Restore the `vercel.json` functions entry:
   ```json
   "api/stripe-webhook.js": { "maxDuration": 30 }
   ```
3. Set `STRIPE_PAUSED = false` in `src/services/subscriptionService.js`
4. Ensure Stripe env vars are configured in Vercel:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY`
   - `OWNER_PRICE_MONTHLY`, `OWNER_PRICE_ANNUAL`
   - `FLEET_PRICE_MONTHLY`, `FLEET_PRICE_ANNUAL`
5. Re-register the webhook URL in Stripe Dashboard → Developers → Webhooks

## Files

| File | Original path | Purpose |
|------|--------------|--------|
| `create-checkout-session.js` | `api/create-checkout-session.js` | Stripe Checkout session creation |
| `create-portal-session.js` | `api/create-portal-session.js` | Stripe Customer Portal session |
| `stripe-webhook.js` | `api/stripe-webhook.js` | Stripe webhook event processing |
