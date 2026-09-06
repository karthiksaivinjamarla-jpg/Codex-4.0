(function () {
  const KEY = 'codex-theme';
  const DEFAULT = 'dark';

  const isSubdirectory = window.location.pathname.includes('/pages/') ||
                         window.location.pathname.includes('\\pages\\');
  const rootPrefix = isSubdirectory ? '../' : './';

  function applyTheme(theme) {
    const value = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('light', value === 'light');
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem(KEY, value); } catch (_) {}

    document.querySelectorAll('[data-theme]').forEach((button) => {
      button.classList.toggle('active', button.dataset.theme === value);
      button.setAttribute('aria-pressed', button.dataset.theme === value ? 'true' : 'false');
    });

    const meta = document.head.querySelector('meta[name="theme-color"]');
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
    addMeta('description', "CODEX 4.0 — an inter-college coding event by Coders' Club GPREC. Build. Think. Compete.");
    addMeta('robots', 'index,follow');
    addMeta('', 'CODEX 4.0 | Inter-College Coding Event', 'og:title');
    addMeta('', "Inter-college coding competition by Coders' Club GPREC. Team up, solve problems and compete.", 'og:description');
    addMeta('', 'website', 'og:type');
    addMeta('', 'https://karthiksaivinjamarla-jpg.github.io/Codex-4.0/', 'og:url');
    addMeta('', 'CODEX 4.0', 'og:site_name');
    addMeta('', 'summary_large_image', 'twitter:card');
    addMeta('', 'CODEX 4.0 | Inter-College Coding Event', 'twitter:title');
    addMeta('', "Inter-college coding competition by Coders' Club GPREC.", 'twitter:description');
  }

  function setupMobileStyles() {
    if (document.getElementById('codex-mobile-styles')) return;
    const link = document.createElement('link');
    link.id = 'codex-mobile-styles';
    link.rel = 'stylesheet';
    link.href = `${rootPrefix}css/mobile.css`;
    document.head.appendChild(link);
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
    if (/\/auth\.html$/i.test(window.location.pathname)) return;
    const existing = document.querySelector('script[src*="auth-bridge.js"]');
    if (existing) return;

    const authScript = document.createElement('script');
    authScript.src = `${rootPrefix}js/auth/auth-bridge.js`;
    authScript.defer = true;
    document.head.appendChild(authScript);
  }

  function setupBrandLogos() {
    const header = document.querySelector('.site-header .header-inner');
    const brand = header?.querySelector('.brand');
    if (!header || !brand) return;

    header.querySelectorAll('.codex-header-logo').forEach((logo) => logo.remove());
    if (header.querySelector('.college-logo')) return;

    const collegeLogo = document.createElement('img');
    collegeLogo.src = `${rootPrefix}assets/college-logo.png`;
    collegeLogo.alt = 'G. Pulla Reddy Engineering College logo';
    collegeLogo.className = 'codex-header-logo college-logo';
    collegeLogo.loading = 'eager';
    collegeLogo.decoding = 'async';
    collegeLogo.onerror = () => { collegeLogo.style.display = 'none'; };

    if (!document.getElementById('codex-logo-styles')) {
      const logoStyle = document.createElement('style');
      logoStyle.id = 'codex-logo-styles';
      logoStyle.textContent = `
        .codex-header-logo{width:40px;height:40px;object-fit:contain;flex:0 0 40px;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.25))}
        .codex-header-logo.college-logo{margin-right:2px}
        .header-inner{gap:12px}
        @media(max-width:900px){.codex-header-logo{width:34px;height:34px;flex-basis:34px}.header-inner{gap:8px}.brand{min-width:0}}
      `;
      document.head.appendChild(logoStyle);
    }

    header.insertBefore(collegeLogo, brand);
  }

  function setupMobileNavigation() {
    const headers = document.querySelectorAll('.site-header .header-inner');
    headers.forEach((header) => {
      const nav = header.querySelector('.nav');
      if (!nav || header.querySelector('.mobile-menu-toggle')) return;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'mobile-menu-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
      toggle.innerHTML = '<span>☰</span>';

      const panel = document.createElement('nav');
      panel.className = 'mobile-nav-panel';
      panel.setAttribute('aria-label', 'Mobile navigation');
      panel.innerHTML = nav.innerHTML;

      const closePanel = () => {
        panel.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation menu');
        toggle.innerHTML = '<span>☰</span>';
      };

      toggle.addEventListener('click', () => {
        const open = !panel.classList.contains('open');
        panel.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
        toggle.innerHTML = open ? '<span>×</span>' : '<span>☰</span>';
      });

      panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', closePanel));
      document.addEventListener('click', (event) => {
        if (!panel.classList.contains('open')) return;
        if (!header.contains(event.target) && !panel.contains(event.target)) closePanel();
      });

      header.appendChild(toggle);
      document.body.appendChild(panel);
    });
  }

  function setupTestRegistrationHelper() {
    const params = new URLSearchParams(window.location.search);
    const allowedHost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.vercel.app');
    if (!allowedHost || params.get('test') !== '1' || !document.querySelector('#registrationForm')) return;
    if (document.querySelector('script[data-test-registration-helper]')) return;

    const script = document.createElement('script');
    script.src = `${rootPrefix}js/testing/test-registration.js`;
    script.dataset.testRegistrationHelper = 'true';
    script.defer = true;
    document.body.appendChild(script);
  }

  window.codexSetupBrandLogos = setupBrandLogos;
  window.codexSetupMobileNavigation = setupMobileNavigation;

  let saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (_) {}
  applyTheme(saved);
  setupMobileStyles();
  setupPromotionMetadata();
  setupAccessibility();
  setupSmoothInteractions();
  setupRegistrationAccess();
  setupBrandLogos();
  setupMobileNavigation();
  setupTestRegistrationHelper();

  // Do not observe the entire document. The previous MutationObserver could
  // repeatedly react to dynamic navbar/auth DOM changes and keep the main thread
  // busy, making the local page appear frozen/unresponsive. Dynamic components
  // explicitly call the setup functions after they are injected.
  document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });
})();
