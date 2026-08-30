-- CODEX 4.0 — Razorpay Payment Fields Migration
-- Run this ONCE in Supabase SQL Editor (Project → SQL Editor).
-- This migration is NON-DESTRUCTIVE: it only adds new nullable columns.
-- Existing registration rows are preserved unchanged.
-- Existing rows will get payment_status = 'pending' (they were manually verified).

-- Add Razorpay-specific columns to the registrations table.
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS payment_status       text         DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS razorpay_order_id    text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id  text,
  ADD COLUMN IF NOT EXISTS payment_verified_at  timestamptz,
  ADD COLUMN IF NOT EXISTS payment_amount_paise integer,
  ADD COLUMN IF NOT EXISTS payment_currency     text         DEFAULT 'INR';

-- Unique constraint on razorpay_order_id prevents duplicate registrations
-- from the same Razorpay order at the database level.
-- Using WHERE clause to allow multiple NULLs (for legacy rows without an order).
CREATE UNIQUE INDEX IF NOT EXISTS registrations_razorpay_order_id_unique
  ON public.registrations (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Unique constraint on razorpay_payment_id prevents reusing a payment ID
-- across multiple registrations at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_razorpay_payment_id_unique
  ON public.registrations (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- Optional: mark existing manually-approved rows as paid so they don't appear
-- as pending in the admin dashboard. Run this if you want to migrate old data.
-- UPDATE public.registrations
--   SET payment_status = 'paid'
--   WHERE status = 'Approved' AND payment_status = 'pending';

-- Verify the columns were added.
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registrations'
  AND column_name IN (
    'payment_status', 'razorpay_order_id', 'razorpay_payment_id',
    'payment_verified_at', 'payment_amount_paise', 'payment_currency'
  )
ORDER BY column_name;
