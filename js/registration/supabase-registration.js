// js/registration/supabase-registration.js
// Provides the shared Supabase client for the registration page.
//
// Responsibilities:
//  - Initialize and expose window.CODEX_SUPABASE_REGISTRATION.client
//  - Used by script.js (loadExistingRegistration) and razorpay.js (session check)
//
// The registration INSERT is handled server-side in /api/razorpay/verify-payment.js
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

  window.CODEX_SUPABASE_REGISTRATION = { client };

  // register.html does not directly load theme.js. Load the shared layer here
  // so registration receives the same mobile navigation, theme control,
  // field enhancements and portal footer as the other CODEX pages.
  if (!document.querySelector('script[src="./theme.js"], script[src="theme.js"]')) {
    const themeScript = document.createElement('script');
    themeScript.src = './theme.js';
    themeScript.defer = true;
    document.body.appendChild(themeScript);
  }
})();
