# CODEX 4.0 — Project Tracker

## To Do

### Razorpay
- [ ] Configure Razorpay Test Mode credentials in Vercel Preview
- [ ] Configure Test Mode webhook
- [ ] Deploy Preview
- [ ] Perform test checkout
- [ ] Verify Supabase payment record

### QA
- [ ] Registration happy path
- [ ] Payment cancellation
- [ ] Payment failure
- [ ] Duplicate submission
- [ ] Network retry
- [ ] Webhook retry
- [ ] Admin verification
- [ ] Mobile browser testing

## In Progress
- Razorpay integration final testing
- Repository architecture refactor

## Complete
- Google OAuth integration
- Supabase registration persistence
- Razorpay server endpoints
- Payment signature verification
- Webhook signature verification
- Manual receipt workflow removal
- Payment ID uniqueness protection
- Standalone public pages
- Shared navbar/footer

## Release Gate
The project must not move to live payments until all payment and security checks are complete.
