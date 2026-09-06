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

  function alignSharedHeaderControls() {
    const header = document.querySelector('.site-header .header-inner');
    const nav = header?.querySelector('.nav, .top-nav');
    const themeSwitch = document.querySelector('.theme-switch');

    // Theme control belongs in the header on every desktop page, immediately
    // after the navigation (whose final action is Register). Mobile CSS moves
    // it back to the compact fixed position.
    if (header && nav && themeSwitch && themeSwitch.parentElement !== header) {
      nav.insertAdjacentElement('afterend', themeSwitch);
    }

    // The navbar is loaded after theme.js on subpages, so initialize the
    // mobile menu only after the shared header actually exists.
    if (typeof window.codexSetupMobileNavigation === 'function') {
      window.codexSetupMobileNavigation();
    }
  }

  async function loadComponent(targetId, componentName) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const componentPath = `${rootPrefix}components/${componentName}.html`;

    try {
      const response = await fetch(componentPath);
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${componentPath}`);
      let html = await response.text();

      html = html.replace(/\{\{ROOT\}\}/g, rootPrefix)
                 .replace(/\{\{PAGES\}\}/g, pagesPrefix);

      target.innerHTML = html;

      if (componentName === 'navbar') {
        highlightActiveNavLink(target);
        if (typeof window.codexSetupBrandLogos === 'function') {
          window.codexSetupBrandLogos();
        }
        if (typeof window.codexInitAuthUI === 'function') {
          window.codexInitAuthUI();
        }
        alignSharedHeaderControls();
      }
    } catch (error) {
      console.warn(`Dynamic component load failed for ${componentName}:`, error);
      renderFallback(targetId, componentName);
      if (componentName === 'navbar') alignSharedHeaderControls();
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
            <a class="brand" href="${rootPrefix}index.html" aria-label="CODEX 4.0 home">
              <span class="brand-mark"><img class="brand-logo" src="${rootPrefix}assets/coders-club-logo.jpg" alt="Coders' Club GPREC logo" width="42" height="42"></span>
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
        <footer class="footer portal-footer">
          <div class="footer-inner">
            <div class="footer-brand">
              <div class="footer-brand-title">CODEX <span>4.0</span></div>
              <p>Inter-College Coding Event organized by <strong>Coders' Club GPREC</strong>.</p>
              <p class="footer-tagline">Build. Think. Compete.</p>
            </div>
            <div class="footer-column">
              <h3>Quick Links</h3>
              <a href="${rootPrefix}index.html">Home Page</a>
              <a href="${pagesPrefix}about.html">About CODEX</a>
              <a href="${rootPrefix}register.html"><strong>Team Registration</strong></a>
              <a href="${pagesPrefix}highlights.html">Highlights</a>
              <a href="${pagesPrefix}timeline.html">Timeline</a>
              <a href="${pagesPrefix}faq.html">Frequently Asked Questions</a>
            </div>
            <div class="footer-column">
              <h3>Explore</h3>
              <a href="${pagesPrefix}prizes.html">Prizes</a>
              <a href="${pagesPrefix}details.html">Event Details</a>
              <a href="${pagesPrefix}rounds.html">Rounds</a>
              <a href="${pagesPrefix}contact.html">Contact</a>
              <a href="${rootPrefix}register.html#terms">Terms &amp; Rules</a>
            </div>
            <div class="footer-column footer-contact">
              <h3>For Queries</h3>
              <a href="mailto:codersclub@gprec.ac.in">codersclub@gprec.ac.in</a>
              <p>G. Pulla Reddy Engineering College</p>
              <p>CSM Block, Kurnool, Andhra Pradesh</p>
            </div>
          </div>
          <div class="footer-bottom">
            <div>© 2026 CODEX 4.0 · Coders' Club GPREC.</div>
            <div class="footer-credit">Student-led · Powered by Coders' Club</div>
            <div class="footer-legal"><a href="${pagesPrefix}contact.html">Privacy &amp; Guidelines</a></div>
          </div>
        </footer>
      `;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadComponent('navbar', 'navbar');
    loadComponent('footer', 'footer');
  });
})();