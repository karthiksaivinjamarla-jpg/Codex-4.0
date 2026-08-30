const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim().replace(/^[\"']|[\"']$/g, "");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^[\"']|[\"']$/g, "");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("registration/status: Missing Supabase server environment variables.");
    return res.status(500).json({ error: "Registration lookup is not configured." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid request body." });
  }

  const registrationId = String(body?.registrationId || "").trim();
  const leaderEmail = String(body?.leaderEmail || "").trim().toLowerCase();

  if (!registrationId || !leaderEmail) {
    return res.status(400).json({ error: "Registration ID and leader email are required." });
  }

  if (registrationId.length > 80 || leaderEmail.length > 254) {
    return res.status(400).json({ error: "Invalid lookup details." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await supabase
    .from("registrations")
    .select("registration_id,team_name,college_name,team_size,leader_email,status,payment_status,razorpay_payment_id,created_at")
    .eq("registration_id", registrationId)
    .eq("leader_email", leaderEmail)
    .maybeSingle();

  if (error) {
    console.error("registration/status: Supabase lookup failed:", error.message);
    return res.status(500).json({ error: "Unable to check registration right now." });
  }

  // Do not reveal whether an ID exists when the email does not match.
  if (!data) {
    return res.status(404).json({ error: "Registration not found. Check your Registration ID and leader email." });
  }

  return res.status(200).json({
    found: true,
    registration: {
      registrationId: data.registration_id,
      teamName: data.team_name,
      collegeName: data.college_name,
      teamSize: data.team_size,
      status: data.status || "Pending",
      paymentStatus: data.payment_status || "pending",
      paymentId: data.razorpay_payment_id || null,
      createdAt: data.created_at
    }
  });
};
