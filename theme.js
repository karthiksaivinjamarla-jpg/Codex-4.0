(function () {
  const KEY = 'codex-theme';
  const DEFAULT = 'dark';
  const isSubdirectory = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
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
    document.querySelectorAll('.theme-toggle-single').forEach((button) => {
      button.textContent = value === 'light' ? '☀' : '☾';
      button.setAttribute('aria-label', value === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      button.title = value === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    });
    const meta = document.head.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'light' ? '#F2F2F2' : '#0D0D0D');
  }

  function addMeta(name, content, property) {
    if (!content) return;
    const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
    let meta = document.head.querySelector(selector);
    if (!meta) { meta = document.createElement('meta'); if (property) meta.setAttribute('property', property); else meta.setAttribute('name', name); document.head.appendChild(meta); }
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
    const link = document.createElement('link'); link.id = 'codex-mobile-styles'; link.rel = 'stylesheet'; link.href = `${rootPrefix}css/mobile.css`; document.head.appendChild(link);
  }

  function setupAccessibility() {
    document.querySelectorAll('[data-theme]').forEach((button) => { button.setAttribute('type', 'button'); button.setAttribute('aria-label', `${button.dataset.theme === 'light' ? 'Switch to light' : 'Switch to dark'} theme`); });
    document.querySelectorAll('a').forEach((link) => { const href = link.getAttribute('href') || ''; if (href.startsWith('http') && !link.getAttribute('aria-label')) { const label = link.textContent.trim(); if (label) link.setAttribute('aria-label', label); } });
    document.querySelectorAll('button, a').forEach((el) => el.classList.add('keyboard-focusable'));
  }

  function setupSmoothInteractions() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => { link.addEventListener('click', () => { const target = document.querySelector(link.getAttribute('href')); if (target) target.setAttribute('tabindex', '-1'); }); });
  }

  function setupRegistrationAccess() {
    if (/\/auth\.html$/i.test(window.location.pathname)) return;
    const existing = document.querySelector('script[src*="auth-bridge.js"]');
    if (existing) return;
    const authScript = document.createElement('script'); authScript.src = `${rootPrefix}js/auth/auth-bridge.js`; authScript.defer = true; document.head.appendChild(authScript);
  }

  function setupBrandLogos() {
    document.querySelectorAll('.site-header .header-inner').forEach((header) => {
      const brand = header.querySelector('.brand'); if (!brand) return;
      let group = header.querySelector('.header-brand-group');
      if (!group) {
        group = document.createElement('div');
        group.className = 'header-brand-group';
        header.insertBefore(group, brand);
        group.appendChild(brand);
      }
      group.querySelectorAll('.codex-header-logo:not(.college-logo)').forEach((el) => el.remove());
      if (!group.querySelector('.codex-header-logo')) {
        const collegeLogo = document.createElement('img');
        collegeLogo.src = `${rootPrefix}assets/college-logo.png`;
        collegeLogo.alt = 'G. Pulla Reddy Engineering College logo';
        collegeLogo.className = 'codex-header-logo college-logo';
        collegeLogo.loading = 'eager';
        collegeLogo.decoding = 'async';
        collegeLogo.onerror = () => { collegeLogo.style.display = 'none'; };
        group.insertBefore(collegeLogo, brand);
      }
      if (!document.getElementById('codex-logo-styles')) {
        const logoStyle = document.createElement('style');
        logoStyle.id = 'codex-logo-styles';
        logoStyle.textContent = `.site-header .header-inner{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important}.header-brand-group{display:inline-flex!important;flex-direction:row!important;align-items:center!important;gap:10px!important;flex:0 1 auto!important;min-width:0!important}.header-brand-group .brand{display:inline-flex!important;align-items:center!important;gap:8px!important;min-width:0!important}.site-header .codex-header-logo,.site-header .brand-mark,.site-header .brand-mark .brand-logo{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;flex:0 0 40px!important;border-radius:8px!important;border:1px solid rgba(255,255,255,.12)!important;background:#0d0d0d!important;object-fit:contain!important;padding:3px!important;box-sizing:border-box!important;box-shadow:0 2px 6px rgba(0,0,0,.5)!important;display:flex!important;align-items:center!important;justify-content:center!important}body.light .site-header .codex-header-logo,body.light .site-header .brand-mark,body.light .site-header .brand-mark .brand-logo{background:#fff!important;border-color:rgba(13,13,13,.14)!important;box-shadow:0 2px 6px rgba(0,0,0,.08)!important}`;
        document.head.appendChild(logoStyle);
      }
    });
  }

  function setupMobileNavigation() {
    document.querySelectorAll('.site-header .header-inner').forEach((header) => {
      const nav = header.querySelector('.nav, .top-nav'); if (!nav || header.querySelector('.mobile-menu-toggle')) return;
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'mobile-menu-toggle'; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation menu'); toggle.innerHTML = '<span aria-hidden="true">☰</span>';
      const panel = document.createElement('nav'); panel.className = 'mobile-nav-panel'; panel.setAttribute('aria-label', 'Mobile navigation'); panel.innerHTML = nav.innerHTML;
      const closePanel = () => { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation menu'); toggle.innerHTML = '<span aria-hidden="true">☰</span>'; };
      toggle.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); const open = !panel.classList.contains('open'); panel.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu'); toggle.innerHTML = open ? '<span aria-hidden="true">×</span>' : '<span aria-hidden="true">☰</span>'; });
      panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', closePanel));
      document.addEventListener('click', (event) => { if (panel.classList.contains('open') && !header.contains(event.target) && !panel.contains(event.target)) closePanel(); });
      header.appendChild(toggle); document.body.appendChild(panel);
    });
  }

  function setupThemeToggle() {
    document.querySelectorAll('.theme-switch').forEach((switcher) => {
      if (switcher.dataset.singleToggleReady === 'true') return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'theme-toggle-single'; button.setAttribute('aria-label', 'Switch theme'); button.title = 'Switch between dark and light mode'; button.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
      switcher.innerHTML = ''; switcher.appendChild(button);
      const headerInner = document.querySelector('.site-header .header-inner');
      if (headerInner) { const nav = headerInner.querySelector('.nav, .top-nav'); if (nav) nav.insertAdjacentElement('afterend', switcher); else headerInner.appendChild(switcher); }
      if (!document.getElementById('codex-theme-position-styles')) { const style = document.createElement('style'); style.id = 'codex-theme-position-styles'; style.textContent = `@media (min-width:901px){.site-header .header-inner{justify-content:flex-start!important}.site-header .header-inner>.nav{margin-left:auto!important}.site-header .header-inner>.theme-switch{position:static!important;top:auto!important;left:auto!important;right:auto!important;transform:none!important;margin:0 0 0 12px!important;flex:0 0 auto!important;z-index:210!important}}@media (max-width:900px){.site-header .header-inner>.theme-switch{position:static!important;top:auto!important;left:auto!important;right:auto!important;transform:none!important;margin:0 0 0 auto!important;flex:0 0 auto!important;z-index:210!important}}`; document.head.appendChild(style); }
      switcher.dataset.singleToggleReady = 'true';
    });
    applyTheme(document.documentElement.dataset.theme || DEFAULT);
  }

  function setupRegistrationFields() {
    const branchOptions = [['Computer Science & Engineering (CSE)','CSE'],['Information Technology (IT)','IT'],['Artificial Intelligence & Data Science (AI & DS)','AI & DS'],['Artificial Intelligence & Machine Learning (AIML)','AIML'],['Computer Science & Business Systems (CSBS)','CSBS'],['Computer Science & Machine Learning (CSM)','CSM'],['Computer Science - Data Science (CS-DS)','CS-DS'],['Electronics & Communication Engineering (ECE)','ECE'],['Electrical & Electronics Engineering (EEE)','EEE'],['Mechanical Engineering (MECH)','MECH'],['Civil Engineering (CIVIL)','CIVIL'],['Cyber Security','Cyber Security'],['Data Science','Data Science']];
    const sectionOptions = ['A','B','C','D','E'];
    document.querySelectorAll('input[list="branchSuggestions"]').forEach((input) => { if (input.dataset.dropdownReady === 'true') return; const select = document.createElement('select'); Array.from(input.attributes).forEach((attribute) => { if (!['list','type','placeholder'].includes(attribute.name)) select.setAttribute(attribute.name, attribute.value); }); select.name=input.name; select.required=input.required; select.className=input.className; const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='Select Branch'; placeholder.disabled=true; placeholder.selected=!input.value; select.appendChild(placeholder); branchOptions.forEach(([label,value])=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option)}); if(input.value)select.value=input.value; input.replaceWith(select); select.dataset.dropdownReady='true'; });
    document.querySelectorAll('input[list="sectionSuggestions"]').forEach((input) => { if (input.dataset.dropdownReady === 'true') return; const select=document.createElement('select'); Array.from(input.attributes).forEach((attribute)=>{if(!['list','type','placeholder'].includes(attribute.name))select.setAttribute(attribute.name,attribute.value)}); select.name=input.name;select.required=input.required;select.className=input.className;const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select Section';placeholder.disabled=true;placeholder.selected=!input.value;select.appendChild(placeholder);sectionOptions.forEach((value)=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.appendChild(option)});if(input.value)select.value=input.value;input.replaceWith(select);select.dataset.dropdownReady='true'; });
  }

  function setupTestRegistrationHelper() {
    const params=new URLSearchParams(window.location.search); const allowedHost=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'||window.location.hostname.endsWith('.vercel.app'); if(!allowedHost||params.get('test')!=='1'||!document.querySelector('#registrationForm'))return; if(document.querySelector('script[data-test-registration-helper]'))return; const script=document.createElement('script');script.src=`${rootPrefix}js/testing/test-registration.js`;script.dataset.testRegistrationHelper='true';script.defer=true;document.body.appendChild(script);
  }

  function setupPortalFooter() {
    const existing = document.querySelector('footer.footer');
    const target = document.getElementById('footer');
    if (!existing && !target) return;
    if (document.querySelector('.portal-footer')) return;
    const footer = document.createElement('footer'); footer.className='footer portal-footer';
    footer.innerHTML=`<div class="footer-inner"><div class="footer-brand"><div class="footer-brand-title">CODEX <span>4.0</span></div><p>Inter-College Coding Event organized by <strong>Coders' Club GPREC</strong>.</p><p class="footer-tagline">Build. Think. Compete.</p></div><div class="footer-column"><h3>Quick Links</h3><a href="${rootPrefix}index.html">Home Page</a><a href="${rootPrefix}pages/about.html">About CODEX</a><a href="${rootPrefix}register.html"><strong>Team Registration</strong></a><a href="${rootPrefix}pages/highlights.html">Highlights</a><a href="${rootPrefix}pages/timeline.html">Timeline</a><a href="${rootPrefix}pages/faq.html">Frequently Asked Questions</a></div><div class="footer-column"><h3>Explore</h3><a href="${rootPrefix}pages/prizes.html">Prizes</a><a href="${rootPrefix}pages/details.html">Event Details</a><a href="${rootPrefix}pages/rounds.html">Rounds</a><a href="${rootPrefix}pages/contact.html">Contact</a><a href="${rootPrefix}register.html#terms">Terms &amp; Rules</a></div><div class="footer-column footer-contact"><h3>For Queries</h3><a href="mailto:codersclub@gprec.ac.in">codersclub@gprec.ac.in</a><p>G. Pulla Reddy Engineering College</p><p>CSM Block, Kurnool, Andhra Pradesh</p></div></div><div class="footer-bottom"><div>© 2026 CODEX 4.0 · Coders' Club GPREC.</div><div class="footer-credit">Student-led · Powered by Coders' Club</div><div class="footer-legal"><a href="${rootPrefix}pages/contact.html">Privacy &amp; Guidelines</a></div></div>`;
    if (target) target.innerHTML=''; else existing.replaceWith(document.createElement('div'));
    (target || document.querySelector('body > div:last-of-type'))?.appendChild?.(footer);
    if (!target) document.body.appendChild(footer);
  }

  window.codexSetupBrandLogos=setupBrandLogos; window.codexSetupMobileNavigation=setupMobileNavigation; window.codexApplyTheme=applyTheme; window.codexSetupRegistrationFields=setupRegistrationFields;
  let saved=DEFAULT; try{saved=localStorage.getItem(KEY)||DEFAULT}catch(_){}
  applyTheme(saved); setupMobileStyles(); setupPromotionMetadata(); setupAccessibility(); setupSmoothInteractions(); setupRegistrationAccess(); setupBrandLogos(); setupMobileNavigation(); setupThemeToggle(); setupRegistrationFields(); setupTestRegistrationHelper();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupPortalFooter); else setupPortalFooter();
})();