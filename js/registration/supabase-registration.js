// js/registration/supabase-registration.js
// Provides the shared Supabase client for the registration page.
// Also loads the shared CODEX theme/footer so register.html stays consistent
// with the rest of the site without touching payment/authentication logic.

(() => {
  // register.html is a standalone page and does not load the shared shell.
  // Load the shared stylesheet and theme explicitly from the site root.
  if (!document.querySelector('link[data-codex-shared-theme]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './theme.css';
    css.dataset.codexSharedTheme = 'true';
    document.head.appendChild(css);
  }

  if (!document.querySelector('script[src="./theme.js"], script[src="theme.js"]')) {
    const themeScript = document.createElement('script');
    themeScript.src = './theme.js';
    themeScript.defer = true;
    document.body.appendChild(themeScript);
  }

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