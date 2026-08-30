# CODEX 4.0 — Data Schema

## Main Entity: registrations

The existing `public.registrations` table remains the source of truth for participant registrations.

## Registration Identity

```text
Supabase Auth User
      │
      ▼
registrations.user_id
      │
      ├── razorpay_order_id
      │
      └── razorpay_payment_id
```

## Payment Fields

```text
payment_status
razorpay_order_id
razorpay_payment_id
payment_verified_at
payment_amount_paise
payment_currency
```

## Payment Status

```text
pending
paid
failed
```

Only `paid` means server-side verification succeeded.

## Constraints

Partial unique indexes should exist on `razorpay_order_id` and `razorpay_payment_id` when those values are not null.

## Security
- Browser uses public Supabase credentials only.
- Server-side payment APIs use the service-role key.
- RLS should not be weakened to support payment integration.
- Existing registrations must remain intact during migrations.
