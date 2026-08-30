# CODEX 4.0 — Implementation Plan

## Phase 1 — Architecture
- [x] Separate reusable navbar/footer
- [x] Create standalone public information pages
- [x] Organize CSS and JavaScript directories
- [x] Preserve working authentication and registration

## Phase 2 — Payments
- [x] Add Razorpay order endpoint
- [x] Add Checkout frontend module
- [x] Add server-side signature verification
- [x] Add webhook endpoint
- [x] Add payment fields to registrations
- [x] Add order/payment unique constraints
- [x] Remove manual QR/receipt workflow

## Phase 3 — Security Hardening
- [x] Keep Razorpay secrets server-side
- [x] Keep Supabase service-role key server-side
- [x] Make verification retry-safe
- [x] Make webhook processing idempotent
- [ ] Perform end-to-end Razorpay Test Mode verification

## Phase 4 — Testing
- [ ] Test valid registration
- [ ] Test Razorpay Checkout
- [ ] Test successful payment
- [ ] Test cancelled payment
- [ ] Test failed verification
- [ ] Test duplicate clicks
- [ ] Test verification retry
- [ ] Test webhook retry
- [ ] Verify Supabase record
- [ ] Verify admin dashboard
- [ ] Verify mobile layout

## Phase 5 — Production
- [ ] Confirm event pricing
- [ ] Obtain authorized organizer Razorpay account
- [ ] Configure production environment variables
- [ ] Configure production webhook
- [ ] Test final production deployment
- [ ] Merge approved changes into main
