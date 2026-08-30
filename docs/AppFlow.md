# CODEX 4.0 — Application Flow

## Public Navigation

```text
Home
 ├── About
 ├── Highlights
 ├── Prizes
 ├── Timeline
 ├── Details
 ├── Rounds
 ├── FAQ
 └── Contact
```

## Authentication Flow

```text
User
 ↓
Auth page
 ↓
Google OAuth
 ↓
Supabase session
 ↓
Registration
```

## Registration + Payment Flow

```text
Registration form
 ↓
Validate fields
 ↓
Determine team information
 ↓
Request Razorpay order
 ↓
Razorpay Checkout
 ├── Cancel → return to payment step
 └── Success
       ↓
  Server-side signature verification
       ↓
  Supabase registration/payment update
       ↓
  Confirmation / ticket
```

## Failure Handling

### Payment cancelled
No successful registration is created.

### Payment verification failed
Registration is not marked paid.

### Duplicate verification
The same paid order can safely retry verification without creating another registration.

### Webhook retry
Repeated webhook events must be safe and idempotent.

## Admin Flow

```text
Admin login
 ↓
Protected admin dashboard
 ↓
Registration list
 ↓
Search/filter
 ↓
Payment status
 ↓
Razorpay payment/order details
```
