// js/registration/supabase-registration.js
// Provides the shared Supabase client for the registration page.
// Also loads the shared CODEX theme/footer and normalizes the registration logo.

(() => {
  // register.html is a standalone page and does not load the shared shell.
  // Load shared styling and theme explicitly from the site root.
  if (!document.querySelector('link[data-codex-shared-theme]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = './theme.css';
    css.dataset.codexSharedTheme = 'true';
    document.head.appendChild(css);
  }

  if (!document.querySelector('link[data-codex-register-footer]')) {
    const footerCss = document.createElement('link');
    footerCss.rel = 'stylesheet';
    footerCss.href = './css/register-footer.css';
    footerCss.dataset.codexRegisterFooter = 'true';
    document.head.appendChild(footerCss);
  }

  if (!document.querySelector('script[src="./theme.js"], script[src="theme.js"]')) {
    const themeScript = document.createElement('script');
    themeScript.src = './theme.js';
    themeScript.defer = true;
    document.body.appendChild(themeScript);
  }

  function normalizeRegistrationLogo() {
    const brand = document.querySelector('.site-header .brand');
    if (!brand) return;

    let mark = brand.querySelector('.brand-mark');
    if (!mark) {
      mark = document.createElement('span');
      mark.className = 'brand-mark';
      brand.insertBefore(mark, brand.firstChild);
    }

    let img = mark.querySelector('.brand-logo');
    if (!img) {
      img = document.createElement('img');
      img.className = 'brand-logo';
      mark.replaceChildren(img);
    }

    img.src = './assets/coders-club-logo.jpg';
    img.alt = "Coders' Club GPREC logo";
    img.width = 42;
    img.height = 42;
    img.loading = 'eager';
    img.decoding = 'async';

    Object.assign(mark.style, {
      width: '42px',
      height: '42px',
      minWidth: '42px',
      flex: '0 0 42px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: '0',
      borderRadius: '0',
      position: 'relative'
    });

    Object.assign(img.style, {
      width: '42px',
      height: '42px',
      minWidth: '42px',
      maxWidth: '42px',
      objectFit: 'contain',
      display: 'block',
      position: 'relative',
      transform: 'none',
      margin: '0',
      padding: '0'
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeRegistrationLogo, { once: true });
  } else {
    normalizeRegistrationLogo();
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