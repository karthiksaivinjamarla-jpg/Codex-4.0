// api/razorpay/create-order.js
// Vercel Serverless Function — runs server-side only.
// Creates a Razorpay Order with a server-validated amount.
// The Razorpay Key Secret never leaves this file.

const Razorpay = require("razorpay");

// Fixed registration fee in paise (₹300 = 30000 paise).
// Amount is ALWAYS determined server-side — never trusted from the browser.
const REGISTRATION_FEE_PAISE = 30000;
const CURRENCY = "INR";

module.exports = async function handler(req, res) {
  // Only allow POST.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate environment variables are present.
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("create-order: Missing Razorpay environment variables.");
    return res.status(500).json({ error: "Payment service is not configured." });
  }

  // Parse request body.
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const { userId, teamSize } = body || {};

  // Validate required fields.
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return res.status(400).json({ error: "userId is required." });
  }
  if (!teamSize || !["2", "3", 2, 3].includes(teamSize)) {
    return res.status(400).json({ error: "teamSize must be 2 or 3." });
  }

  // Use a short, non-sensitive receipt reference.
  // DO NOT include PII or secrets in receipt field — it appears in Razorpay dashboard.
  const receipt = `codex4-${Date.now()}`;

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: REGISTRATION_FEE_PAISE, // Always server-determined
      currency: CURRENCY,
      receipt,
      notes: {
        event: "CODEX 4.0",
        team_size: String(teamSize)
      }
    });

    // Return ONLY what the frontend needs.
    // Never return keySecret.
    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId // Public key — safe to send to browser
    });
  } catch (err) {
    console.error("create-order: Razorpay order creation failed:", err.message);
    return res.status(502).json({ error: "Failed to create payment order. Please try again." });
  }
};
