(function () {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  const client = window.supabase?.createClient(config.url || "", config.publishableKey || "", {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const isSubdirectory = window.location.pathname.includes('/pages/') ||
                         window.location.pathname.includes('\\pages\\');
  const rootPrefix = isSubdirectory ? '../' : './';

  function clearAuthHints() {
    sessionStorage.removeItem("codex-auth-ready");
    sessionStorage.removeItem("codex-auth-email");
  }

  function setupBrandLogo() {
    const brandMarks = document.querySelectorAll('.brand-mark');
    brandMarks.forEach(mark => {
      const existing = mark.querySelector('.brand-logo');
      if (existing) {
        existing.src = `${rootPrefix}assets/coders-club-logo.jpg`;
        return;
      }

      mark.textContent = '';
      const img = document.createElement('img');
      img.className = 'brand-logo';
      img.src = `${rootPrefix}assets/coders-club-logo.jpg`;
      img.alt = "Coders' Club GPREC logo";
      img.width = 42;
      img.height = 42;
      img.loading = 'eager';
      img.decoding = 'async';
      img.style.width = '52px';
      img.style.height = '52px';
      img.style.objectFit = 'contain';
      img.style.transform = 'scale(1.18)';
      mark.style.width = '42px';
      mark.style.height = '42px';
      mark.style.overflow = 'hidden';
      mark.appendChild(img);
    });
  }

  window.codexSetupBrandLogos = setupBrandLogo;

  function addSignOutButton() {
    if (document.getElementById("signOutButton")) return;
    const button = document.createElement("button");
    button.id = "signOutButton";
    button.type = "button";
    button.className = "sign-out-btn";
    button.textContent = "SIGN OUT";
    button.title = "Sign out of CODEX 4.0";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "SIGNING OUT...";
      try {
        if (client) await client.auth.signOut();
      } finally {
        clearAuthHints();
        window.location.href = window.location.pathname.endsWith("auth.html") ? "./auth.html" : `${rootPrefix}index.html`;
      }
    });

    const headerInner = document.querySelector(".header-inner");
    if (headerInner) headerInner.appendChild(button);
    else document.querySelector(".auth-main")?.appendChild(button);
  }

  async function init() {
    setupBrandLogo();
    if (!client) return;
    try {
      const { data } = await client.auth.getSession();
      if (data?.session) addSignOutButton();
    } catch (_) {}
  }

  window.codexInitAuthUI = init;

  document.addEventListener("DOMContentLoaded", () => init().catch(error => console.error("Auth UI failed:", error)));
})();
