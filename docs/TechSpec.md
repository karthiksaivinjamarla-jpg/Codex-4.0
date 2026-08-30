# CODEX 4.0 — Technical Specification

## Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Supabase Auth
- Supabase PostgreSQL
- Razorpay Standard Checkout
- Vercel Serverless Functions
- GitHub

## Architecture

```text
Browser
  ├── HTML pages
  ├── CSS
  └── JavaScript
        │
        ├── Supabase Auth (public client key)
        │
        └── Vercel API
              ├── create-order
              ├── verify-payment
              └── webhook
                    │
                    ├── Razorpay
                    └── Supabase service-role access
```

## Repository Organization

```text
pages/
components/
css/
js/core/
js/auth/
js/registration/
js/payments/
js/admin/
api/razorpay/
config/
database/
assets/
```

## Security Boundaries

### Browser-safe
- Razorpay Key ID
- Supabase URL
- Supabase publishable/anon key

### Server-only
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY

Secrets must never be committed to GitHub or returned in API responses.

## Payment API
`POST /api/razorpay/create-order`
- Validate registration context.
- Enforce ₹300 server-side.
- Create Razorpay order.
- Return order ID, amount, currency and public key ID.

`POST /api/razorpay/verify-payment`
- Verify HMAC-SHA256 signature.
- Confirm order/payment association.
- Persist verified payment.
- Be idempotent for retries.

`POST /api/razorpay/webhook`
- Preserve raw request body.
- Verify Razorpay webhook signature.
- Process captured/failed events idempotently.

## Deployment
Vercel Preview + Razorpay Test Mode should be used before Production + Live Mode.
