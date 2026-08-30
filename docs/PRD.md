# CODEX 4.0 — Product Requirements Document

## 1. Product
CODEX 4.0 is a college coding-event registration and management platform. It provides event information, participant registration, Google authentication, Razorpay payments, registration confirmation, and an admin dashboard.

## 2. Goals
- Make event information easy to discover.
- Provide a simple, mobile-first registration experience.
- Authenticate participants securely.
- Replace manual payment/receipt upload with Razorpay Checkout.
- Store verified registration and payment information in Supabase.
- Give authorized admins a reliable registration/payment view.

## 3. Users
### Participant
Can browse the event, authenticate, register a team, pay the registration fee, and receive confirmation.

### Admin
Can view registrations and verified payment information through the protected admin dashboard.

## 4. Core Features
- Landing page
- Standalone About, Highlights, Prizes, Timeline, Details, Rounds, FAQ and Contact pages
- Google OAuth authentication
- Registration form
- Team-size validation
- Razorpay Checkout
- Server-side payment verification
- Razorpay webhook handling
- Duplicate-registration protection
- Supabase persistence
- Admin registration/payment dashboard

## 5. Payment Requirement
The current event rule is a flat ₹300 fee per team. The server must enforce the amount; the browser must never be trusted to choose the final amount.

## 6. Success Criteria
A participant can complete: `Browse → Authenticate → Register → Pay → Verify → Confirmation`

A successful payment must never result in an unverified or duplicate registration.

## 7. Non-Goals
- No frontend framework migration.
- No redesign of working authentication without a specific requirement.
- No manual receipt-upload workflow in the final registration UI.
