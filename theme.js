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
    if (header.querySelector('.codex-header-logo')) return;

    const makeLogo = (src, alt, className) => {
      const img = document.createElement('img');
      img.src = `${rootPrefix}${src}`;
      img.alt = alt;
      img.className = `codex-header-logo ${className}`;
      img.loading = 'eager';
      img.decoding = 'async';
      img.onerror = () => { img.style.display = 'none'; };
      return img;
    };

    const collegeLogo = makeLogo(
      'assets/college-logo.png',
      'G. Pulla Reddy Engineering College logo',
      'college-logo'
    );
    const clubLogo = makeLogo(
      'assets/coders-club-logo.png',
      "Coders' Club logo",
      'club-logo'
    );

    if (!document.getElementById('codex-logo-styles')) {
      const logoStyle = document.createElement('style');
      logoStyle.id = 'codex-logo-styles';
      logoStyle.textContent = `
        .codex-header-logo{width:42px;height:42px;object-fit:contain;flex:0 0 42px;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,.25))}
        .codex-header-logo.college-logo{margin-right:2px}
        .codex-header-logo.club-logo{margin-right:8px}
        .header-inner{gap:12px}
        @media(max-width:900px){
          .codex-header-logo{width:36px;height:36px;flex-basis:36px}
          .codex-header-logo.club-logo{margin-right:2px}
          .header-inner{gap:8px}
          .brand{min-width:0}
        }
        @media(max-width:600px){
          .codex-header-logo{width:32px;height:32px;flex-basis:32px}
          .brand-title{font-size:16px}
        }
      `;
      document.head.appendChild(logoStyle);
    }

    header.insertBefore(collegeLogo, brand);
    header.insertBefore(clubLogo, brand);
  }

  // Export hook for dynamic shell
  window.codexSetupBrandLogos = setupBrandLogos;

  let saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (_) {}
  applyTheme(saved);
  setupPromotionMetadata();
  setupAccessibility();
  setupSmoothInteractions();
  setupRegistrationAccess();
  setupBrandLogos();

  document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });
})();
