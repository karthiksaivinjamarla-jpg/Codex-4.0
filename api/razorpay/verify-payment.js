// api/razorpay/verify-payment.js
// Vercel Serverless Function — runs server-side only.
//
// Security model:
//  1. Verify Razorpay HMAC-SHA256 signature server-side.
//  2. Only after signature passes, insert the registration into Supabase
//     using the service-role key (bypasses RLS — safe because this is server-side).
//  3. The service-role key is NEVER sent to the browser.
//  4. payment_status is set to "paid" ONLY here, never from the browser.

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Fee must match create-order.js — server always determines this.
const REGISTRATION_FEE_PAISE = 30000;
const CURRENCY = "INR";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim().replace(/^["']|["']$/g, "");
  const rawSupabaseUrl = (process.env.SUPABASE_URL || "https://lrwrqerurimwzalhjffa.supabase.co").trim().replace(/^["']|["']$/g, "");
  const supabaseUrl = formatSupabaseUrl(rawSupabaseUrl);
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^["']|["']$/g, "");

  if (!keySecret || !supabaseUrl || !serviceRoleKey) {
    console.error("verify-payment: Missing environment variables.");
    return res.status(500).json({ error: "Payment service is not configured." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    registrationData
  } = body || {};

  // Validate all required Razorpay fields.
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification fields." });
  }

  // Validate registration data exists and has a userId.
  if (!registrationData || !registrationData.user_id) {
    return res.status(400).json({ error: "Missing registration data." });
  }

  // ---------------------------------------------------------------
  // STEP 1: Verify Razorpay HMAC-SHA256 signature.
  // This is the primary security check. The signature is computed as:
  // HMAC-SHA256(order_id + "|" + payment_id, key_secret)
  // ---------------------------------------------------------------
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.warn("verify-payment: Signature mismatch. Possible tampered request.");
    return res.status(400).json({ error: "Payment signature verification failed." });
  }

  // ---------------------------------------------------------------
  // STEP 2: Insert registration into Supabase using service-role key.
  // The service-role key bypasses RLS — this is intentional and safe
  // because this code runs server-side, post signature verification.
  // ---------------------------------------------------------------
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const r = registrationData;
  const teamSize = Number(r.team_size) || 2;

  // Server-side duplicate check before insert.
  let existing = null;
  const { data: existingData, error: existingError } = await supabase
    .from("registrations")
    .select("registration_id, payment_status, razorpay_order_id, status, created_at")
    .eq("user_id", r.user_id)
    .maybeSingle();

  if (existingError) {
    if (existingError.code !== "PGRST116") {
      console.warn("verify-payment: Duplicate pre-check notice:", existingError.message);
    }
  } else {
    existing = existingData;
  }

  if (existing?.registration_id) {
    // If already paid:
    if (existing.payment_status === "paid") {
      // Idempotent retry: if this is the exact same order that was already verified,
      // return 200 success with the existing registration ID.
      if (existing.razorpay_order_id === razorpay_order_id) {
        return res.status(200).json({
          success: true,
          registrationId: existing.registration_id,
          status: existing.status || "Pending",
          createdAt: existing.created_at
        });
      }

      // Different order attempted on an already-paid account -> block duplicate.
      return res.status(409).json({
        error: "This account already has a completed CODEX 4.0 registration.",
        registrationId: existing.registration_id
      });
    }
    // If pending (abandoned order), update it with the new verified payment.
    const { data: updated, error: updateError } = await supabase
      .from("registrations")
      .update({
        payment_status: "paid",
        razorpay_order_id,
        razorpay_payment_id,
        payment_verified_at: new Date().toISOString(),
        payment_amount_paise: REGISTRATION_FEE_PAISE,
        payment_currency: CURRENCY,
        status: "Pending" // Admin still reviews registration details
      })
      .eq("registration_id", existing.registration_id)
      .select("registration_id")
      .single();

    if (updateError) {
      console.error("verify-payment: Update error:", updateError.message);
      return res.status(500).json({ error: `Failed to update registration: ${updateError.message}` });
    }

    return res.status(200).json({
      success: true,
      registrationId: updated.registration_id
    });
  }

  // New registration — build the data row.
  const insertData = {
    team_name: sanitize(r.team_name),
    team_size: teamSize,
    college_name: sanitize(r.college_name),
    leader_email: sanitize(r.leader_email, true),
    user_id: r.user_id,
    member1_name: sanitize(r.member1_name),
    member1_roll: sanitize(r.member1_roll),
    member1_email: sanitize(r.member1_email, true),
    member1_phone: sanitize(r.member1_phone),
    member1_year: sanitize(r.member1_year),
    member1_branch: sanitize(r.member1_branch),
    member1_section: sanitize(r.member1_section),
    member2_name: sanitize(r.member2_name),
    member2_roll: sanitize(r.member2_roll),
    member2_email: sanitize(r.member2_email, true),
    member2_phone: sanitize(r.member2_phone),
    member2_year: sanitize(r.member2_year),
    member2_branch: sanitize(r.member2_branch),
    member2_section: sanitize(r.member2_section),
    member3_name: teamSize === 3 ? sanitize(r.member3_name) : null,
    member3_roll: teamSize === 3 ? sanitize(r.member3_roll) : null,
    member3_email: teamSize === 3 ? sanitize(r.member3_email, true) : null,
    member3_phone: teamSize === 3 ? sanitize(r.member3_phone) : null,
    member3_year: teamSize === 3 ? sanitize(r.member3_year) : null,
    member3_branch: teamSize === 3 ? sanitize(r.member3_branch) : null,
    member3_section: teamSize === 3 ? sanitize(r.member3_section) : null,
    // Payment fields — only set server-side, after signature verification.
    payment_status: "paid",
    razorpay_order_id,
    razorpay_payment_id,
    payment_verified_at: new Date().toISOString(),
    payment_amount_paise: REGISTRATION_FEE_PAISE,
    payment_amount: 300, // legacy field, keep for admin dashboard
    payment_currency: CURRENCY,
    status: "Pending" // Admin registration review status
  };

  const { data: inserted, error: insertError } = await supabase
    .from("registrations")
    .insert(insertData)
    .select("registration_id, created_at, status")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return res.status(409).json({
        error: "This account or email already has a CODEX 4.0 registration."
      });
    }
    console.error("verify-payment: Insert error:", insertError.message);
    return res.status(500).json({ error: `Registration could not be saved: ${insertError.message}` });
  }

  return res.status(200).json({
    success: true,
    registrationId: inserted.registration_id,
    status: inserted.status,
    createdAt: inserted.created_at
  });
};

// Sanitize helper — trims strings, optionally lowercases.
function sanitize(val, lower = false) {
  if (val == null) return null;
  const s = String(val).trim();
  return lower ? s.toLowerCase() : s;
}

// Clean and validate Supabase URL (strip trailing slashes, /rest/v1 paths, quotes)
function formatSupabaseUrl(url) {
  if (!url) return "https://lrwrqerurimwzalhjffa.supabase.co";
  let clean = url.trim().replace(/^["']|["']$/g, "");
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }
  clean = clean.replace(/\/rest\/v1\/?$/i, "").replace(/\/auth\/v1\/?$/i, "").replace(/\/+$/, "");
  return clean;
}
