(function () {
  const KEY = 'codex-theme';
  const DEFAULT = 'dark';

  function applyTheme(theme) {
    const value = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('light', value === 'light');
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem(KEY, value); } catch (_) {}

    document.querySelectorAll('[data-theme]').forEach((button) => {
      button.classList.toggle('active', button.dataset.theme === value);
      button.setAttribute('aria-pressed', button.dataset.theme === value ? 'true' : 'false');
    });

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'light' ? '#F2F2F2' : '#0D0D0D');
  }

  function addMeta(name, content, property) {
    if (!content) return;
    const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
    let meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      if (property) meta.setAttribute('property', property);
      else meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  function setupPromotionMetadata() {
    addMeta('description', 'CODEX 4.0 — an inter-college coding event by Coders\' Club GPREC. Build. Think. Compete.');
    addMeta('robots', 'index,follow');
    addMeta('', 'CODEX 4.0 | Inter-College Coding Event', 'og:title');
    addMeta('', 'Inter-college coding competition by Coders\' Club GPREC. Team up, solve problems and compete.', 'og:description');
    addMeta('', 'website', 'og:type');
    addMeta('', 'https://karthiksaivinjamarla-jpg.github.io/Codex-4.0/', 'og:url');
    addMeta('', 'CODEX 4.0', 'og:site_name');
    addMeta('', 'summary_large_image', 'twitter:card');
    addMeta('', 'CODEX 4.0 | Inter-College Coding Event', 'twitter:title');
    addMeta('', 'Inter-college coding competition by Coders\' Club GPREC.', 'twitter:description');
  }

  function setupAccessibility() {
    document.querySelectorAll('[data-theme]').forEach((button) => {
      button.setAttribute('type', 'button');
      button.setAttribute('aria-label', `${button.dataset.theme === 'light' ? 'Switch to light' : 'Switch to dark'} theme`);
    });

    document.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http') && !link.getAttribute('aria-label')) {
        const label = link.textContent.trim();
        if (label) link.setAttribute('aria-label', label);
      }
    });

    document.querySelectorAll('button, a').forEach((el) => el.classList.add('keyboard-focusable'));
  }

  function setupSmoothInteractions() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.setAttribute('tabindex', '-1');
      });
    });
  }

  function setupRegistrationAccess() {
    // auth.html already loads auth.js, which owns the Supabase client.
    // Avoid creating a second GoTrueClient on the authentication page.
    if (/\/auth\.html$/i.test(window.location.pathname)) return;

    const authScript = document.createElement('script');
    authScript.src = './auth-bridge.js';
    authScript.defer = true;
    document.head.appendChild(authScript);
  }

  function setupLocalTestHelper() {
    if (location.protocol !== 'http:' || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    if (!document.body.classList.contains('register-page')) return;
    if (new URLSearchParams(location.search).get('test') !== '1') return;

    const testScript = document.createElement('script');
    testScript.src = './test-autofill.js';
    testScript.defer = true;
    document.head.appendChild(testScript);
  }

  let saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (_) {}
  applyTheme(saved);
  setupPromotionMetadata();
  setupAccessibility();
  setupSmoothInteractions();
  setupRegistrationAccess();
  setupLocalTestHelper();

  document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });
})();
