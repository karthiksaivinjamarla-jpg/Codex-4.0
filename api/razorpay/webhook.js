// api/razorpay/webhook.js
// Vercel Serverless Function — handles Razorpay webhook events.
//
// Security:
//  - Disables Vercel's automatic bodyParser so raw request stream is preserved.
//  - Verifies X-Razorpay-Signature header using HMAC-SHA256 + RAZORPAY_WEBHOOK_SECRET.
//  - Processing is idempotent — duplicate webhook deliveries do not create duplicate rows.
//  - Only handles payment.captured and payment.failed events.
//
// Setup in Razorpay dashboard:
//   URL: https://your-vercel-app.vercel.app/api/razorpay/webhook
//   Events: payment.captured, payment.failed
//   Active: true

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Tell Vercel Serverless runtime to NOT parse the body automatically.
// This ensures the exact raw byte stream is available for cryptographic HMAC verification.
const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("webhook: Missing environment variables.");
    // Return 200 so Razorpay does not keep retrying for a config error.
    return res.status(200).json({ received: true });
  }

  // ---------------------------------------------------------------
  // STEP 1: Read the unparsed raw request body for HMAC calculation.
  // ---------------------------------------------------------------
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (readErr) {
    console.error("webhook: Failed to read raw request body:", readErr.message);
    return res.status(400).json({ error: "Unable to read request payload." });
  }

  const receivedSignature = req.headers["x-razorpay-signature"] || "";

  // ---------------------------------------------------------------
  // STEP 2: Verify webhook signature against the raw unparsed payload.
  // ---------------------------------------------------------------
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== receivedSignature) {
    console.warn("webhook: Invalid signature. Ignoring.");
    return res.status(400).json({ error: "Invalid webhook signature." });
  }

  // ---------------------------------------------------------------
  // STEP 3: Parse JSON only AFTER signature verification succeeds.
  // ---------------------------------------------------------------
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON in webhook body." });
  }

  const eventName = event.event;
  const payload = event.payload?.payment?.entity;

  if (!payload) {
    // Not a payment event we handle.
    return res.status(200).json({ received: true });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  // ---------------------------------------------------------------
  // Handle payment.captured — mark payment as confirmed.
  // Idempotent: skips if payment_status is already "paid".
  // ---------------------------------------------------------------
  if (eventName === "payment.captured") {
    const { error } = await supabase
      .from("registrations")
      .update({
        payment_status: "paid",
        razorpay_payment_id: payload.id,
        payment_verified_at: new Date().toISOString()
      })
      .eq("razorpay_order_id", payload.order_id)
      .neq("payment_status", "paid");

    if (error) {
      console.error("webhook: payment.captured update error:", error.message);
      // Return 500 so Razorpay retries.
      return res.status(500).json({ error: "Database update failed." });
    }
  }

  // ---------------------------------------------------------------
  // Handle payment.failed — mark payment as failed.
  // Safe: only updates if payment_status is still "pending" (cannot overwrite "paid").
  // ---------------------------------------------------------------
  if (eventName === "payment.failed") {
    await supabase
      .from("registrations")
      .update({ payment_status: "failed" })
      .eq("razorpay_order_id", payload.order_id)
      .eq("payment_status", "pending");
  }

  return res.status(200).json({ received: true });
}

// Read raw request stream into a UTF-8 string.
async function getRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

module.exports = handler;
module.exports.config = config;
