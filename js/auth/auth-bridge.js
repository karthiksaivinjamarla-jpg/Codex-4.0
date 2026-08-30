(function () {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  const SUPABASE_URL = config.url || "https://lrwrqerurimwzalhjffa.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = config.publishableKey || "sb_publishable_QRbFkE9mkgIljLF-1zMgGw_f4Ic5OBW";
  const isSubdirectory = window.location.pathname.includes('/pages/') ||
                         window.location.pathname.includes('\\pages\\');
  const rootPrefix = isSubdirectory ? '../' : './';
  const AUTH_PAGE = `${rootPrefix}auth.html`;

  function isRegistrationPage() {
    return /(^|\/)register\.html$/i.test(window.location.pathname);
  }

  function redirectToAuth() {
    const returnUrl = encodeURIComponent(
      window.location.pathname + window.location.search + window.location.hash
    );
    window.location.replace(`${AUTH_PAGE}?return=${returnUrl}`);
  }

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve();
        return;
      }

      const existing = document.querySelector(
        'script[src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"]'
      );

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load Supabase client."));
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    await loadSupabase();

    return window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  async function guardRegistrationPage() {
    if (!isRegistrationPage()) return true;

    try {
      const client = await getClient();
      const { data, error } = await client.auth.getSession();

      if (error || !data.session) {
        redirectToAuth();
        return false;
      }

      const { data: userData, error: userError } =
        await client.auth.getUser();

      if (userError || !userData.user?.email) {
        redirectToAuth();
        return false;
      }

      sessionStorage.setItem("codex-auth-ready", "1");
      sessionStorage.setItem("codex-auth-email", userData.user.email);

      const m1Email = document.querySelector('input[name="m1_email"]');
      if (m1Email && !m1Email.value) {
        m1Email.value = userData.user.email;
      }

      return true;
    } catch (error) {
      console.error("Registration auth guard failed:", error);
      redirectToAuth();
      return false;
    }
  }

  function protectLinksToRegistration() {
    document.addEventListener("click", async event => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (!/(^|\/)register\.html(?:[?#]|$)/i.test(href)) return;

      event.preventDefault();

      try {
        const client = await getClient();
        const { data } = await client.auth.getSession();

        if (data.session) {
          window.location.href = href;
        } else {
          window.location.href = AUTH_PAGE;
        }
      } catch (error) {
        console.error("Registration link auth check failed:", error);
        window.location.href = AUTH_PAGE;
      }
    });
  }

  async function start() {
    if (!window.supabase) {
      await loadSupabase();
    }

    if (isRegistrationPage()) {
      const allowed = await guardRegistrationPage();
      if (!allowed) return;
    }

    protectLinksToRegistration();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      start().catch(error => console.error("Auth bridge failed:", error));
    });
  } else {
    start().catch(error => console.error("Auth bridge failed:", error));
  }
})();
