/**
 * CODEX 4.0 - Page Shell Loader
 * Dynamically loads shared header (navbar) and footer components into target containers,
 * resolving relative paths dynamically depending on whether the page is in root or a subdirectory.
 */

(function () {
  const isSubdirectory = window.location.pathname.includes('/pages/') ||
                         window.location.pathname.includes('\\pages\\');
  const rootPrefix = isSubdirectory ? '../' : './';
  const pagesPrefix = isSubdirectory ? './' : 'pages/';

  async function loadComponent(targetId, componentName) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const componentPath = `${rootPrefix}components/${componentName}.html`;

    try {
      const response = await fetch(componentPath);
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${componentPath}`);
      let html = await response.text();

      // Resolve path variables
      html = html.replace(/\{\{ROOT\}\}/g, rootPrefix)
                 .replace(/\{\{PAGES\}\}/g, pagesPrefix);

      target.innerHTML = html;

      // Post-injection hooks
      if (componentName === 'navbar') {
        highlightActiveNavLink(target);
        // Trigger logo and auth UI hooks if present
        if (typeof window.codexSetupBrandLogos === 'function') {
          window.codexSetupBrandLogos();
        }
        if (typeof window.codexInitAuthUI === 'function') {
          window.codexInitAuthUI();
        }
      }
    } catch (error) {
      console.warn(`Dynamic component load failed for ${componentName}:`, error);
      // Fallback in case fetch is blocked (e.g. file:// protocol)
      renderFallback(targetId, componentName);
    }
  }

  function highlightActiveNavLink(navbarContainer) {
    const currentPath = window.location.pathname.toLowerCase();
    const links = navbarContainer.querySelectorAll('.nav a');
    links.forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const pageName = href.split('/').pop().split('#')[0];
      const currentPageName = currentPath.split('/').pop().split('#')[0] || 'index.html';

      if (pageName && currentPageName === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function renderFallback(targetId, componentName) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (componentName === 'navbar') {
      target.innerHTML = `
        <header class="site-header">
          <div class="header-inner">
            <a class="brand" href="${rootPrefix}index.html">
              <span class="brand-mark">&lt;/&gt;</span>
              <span><span class="brand-title">CODEX <span>4.0</span></span><span class="brand-sub">INTER-COLLEGE CODING EVENT</span></span>
            </a>
            <nav class="nav">
              <a href="${rootPrefix}index.html">Home</a>
              <a href="${pagesPrefix}about.html">About</a>
              <a href="${pagesPrefix}highlights.html">Highlights</a>
              <a href="${pagesPrefix}prizes.html">Prizes</a>
              <a href="${pagesPrefix}timeline.html">Timeline</a>
              <a href="${pagesPrefix}details.html">Details</a>
              <a href="${pagesPrefix}rounds.html">Rounds</a>
              <a href="${pagesPrefix}faq.html">FAQ</a>
              <a href="${pagesPrefix}contact.html">Contact</a>
              <a href="${rootPrefix}register.html" class="register-btn">Register</a>
            </nav>
          </div>
        </header>
      `;
      highlightActiveNavLink(target);
    } else if (componentName === 'footer') {
      target.innerHTML = `
        <footer class="footer">
          <p>© 2026 CODEX 4.0 · Coders' Club GPREC · Build. Think. Compete.</p>
        </footer>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadComponent('navbar', 'navbar');
    loadComponent('footer', 'footer');
  });
})();
