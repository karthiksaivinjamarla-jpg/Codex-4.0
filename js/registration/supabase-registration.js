// js/registration/supabase-registration.js
// Provides the shared Supabase client for the registration page.
//
// Responsibilities:
//  - Initialize and expose window.CODEX_SUPABASE_REGISTRATION.client
//  - Used by script.js (loadExistingRegistration) and razorpay.js (session check)
//
// What was REMOVED (moved to server-side):
//  - uploadReceipt() — receipt upload to Supabase Storage
//  - submitToSupabase() — direct database insert from browser
//  - form 'submit' event listener — form submission now triggered by Razorpay checkout
//
// The registration INSERT is now handled server-side in /api/razorpay/verify-payment.js
// after cryptographic payment signature verification.

(() => {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.publishableKey) {
    console.error("Supabase registration: configuration is missing.");
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  // Expose client for use by script.js and js/payments/razorpay.js
  window.CODEX_SUPABASE_REGISTRATION = { client };
})();
