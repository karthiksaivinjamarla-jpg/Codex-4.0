# CODEX 4.0 — Engineering Rules

## 1. Preserve Working Features
Never break working Google OAuth, registration, Supabase access, or admin authorization while refactoring.

## 2. Security
Never place secrets in frontend JavaScript, HTML, GitHub, or public configuration.

Never expose:
- Razorpay Key Secret
- Razorpay Webhook Secret
- Supabase Service Role Key

## 3. Payments
Never trust a browser-supplied payment amount.

Never mark a payment as paid solely because the browser reports success.

Always verify Razorpay payment signatures server-side.

Webhook requests must be signature-verified and processed idempotently.

## 4. Database
Prefer non-destructive migrations.

Do not recreate production tables to solve application problems.

Use database constraints for important uniqueness guarantees.

## 5. Refactoring
Move code according to responsibility.

Avoid duplicate implementations.

Update all relative paths after moving files.

Do not introduce a framework unless explicitly approved.

## 6. Git
Work on the feature/refactor branch.

Do not commit secrets.

Make logical commits.

Do not merge into `main` until testing is complete.

## 7. Testing
After structural changes, check:
- JavaScript syntax
- broken links
- 404 assets
- browser console errors
- authentication
- registration
- payment
- admin dashboard
- responsive layout

## 8. Change Discipline
Before a large change:
1. Inspect current behavior.
2. Explain the migration.
3. Make the smallest safe change.
4. Test.
5. Commit.
