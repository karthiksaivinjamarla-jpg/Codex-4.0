(function () {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  const client = window.supabase?.createClient(config.url || "", config.publishableKey || "", {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function clearAuthHints() {
    sessionStorage.removeItem("codex-auth-ready");
    sessionStorage.removeItem("codex-auth-email");
  }

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
        window.location.href = window.location.pathname.endsWith("auth.html") ? "./auth.html" : "./index.html";
      }
    });

    const headerInner = document.querySelector(".header-inner");
    if (headerInner) headerInner.appendChild(button);
    else document.querySelector(".auth-main")?.appendChild(button);
  }

  async function init() {
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (data.session) addSignOutButton();
  }

  document.addEventListener("DOMContentLoaded", () => init().catch(error => console.error("Auth UI failed:", error)));
})();
