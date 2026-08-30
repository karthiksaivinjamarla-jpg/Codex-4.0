/* CODEX 4.0 shared logo fallback */
(function () {
  'use strict';

  function setupCodersClubLogo() {
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '../' : './';
    document.querySelectorAll('.brand-mark').forEach((mark) => {
      if (mark.querySelector('.brand-logo')) return;
      const img = document.createElement('img');
      img.className = 'brand-logo';
      img.src = `${prefix}assets/coders-club-logo.png`;
      img.alt = "Coders' Club GPREC logo";
      img.width = 42;
      img.height = 42;
      img.style.cssText = 'width:42px;height:42px;display:block;object-fit:contain;';
      mark.textContent = '';
      mark.appendChild(img);
    });
  }

  window.codexSetupBrandLogos = setupCodersClubLogo;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCodersClubLogo);
  } else {
    setupCodersClubLogo();
  }
})();
