(function () {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  const SUPABASE_URL = config.url || "https://lrwrqerurimwzalhjffa.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = config.publishableKey || "sb_publishable_QRbFkE9mkgIljLF-1zMgGw_f4Ic5OBW";
  const AUTH_PAGE = "./auth.html";

  function isRegistrationPage() {
    return /(^|\/)register\.html$/i.test(window.location.pathname);
  }

  function redirectToAuth() {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.replace(`${AUTH_PAGE}?return=${returnUrl}`);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.supabase) resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getClient() {
    if (!window.supabase) {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
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

      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData.user?.email) {
        redirectToAuth();
        return false;
      }

      sessionStorage.setItem("codex-auth-ready", "1");
      sessionStorage.setItem("codex-auth-email", userData.user.email);

      // Pre-fill leader email
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

  function injectAuthIntoRegistrationRequest() {
    if (!isRegistrationPage()) return;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      const tokenPromise = window.__codexSupabaseSessionPromise;

      if (!url.includes("script.google.com/macros") || !tokenPromise || !init || typeof init.body !== "string") {
        return originalFetch(input, init);
      }

      try {
        const session = await tokenPromise;
        const token = session?.access_token;
        if (token) {
          const body = JSON.parse(init.body);
          body.authToken = token;
          init.body = JSON.stringify(body);
        }
      } catch (error) {
        console.error("Unable to attach Supabase session to registration:", error);
      }

      return originalFetch(input, init);
    };
  }

  function protectLinksToRegistration() {
    document.addEventListener("click", async (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!/(^|\/)register\.html(?:[?#]|$)/i.test(href)) return;

      event.preventDefault();
      try {
        const client = await getClient();
        const { data } = await client.auth.getSession();
        if (data.session) window.location.href = href;
        else window.location.href = AUTH_PAGE;
      } catch (_) {
        window.location.href = AUTH_PAGE;
      }
    });
  }

  async function start() {
    const client = await getClient();
    window.__codexSupabaseSessionPromise = client.auth.getSession().then(({ data }) => data.session || null);

    if (isRegistrationPage()) {
      const allowed = await guardRegistrationPage();
      if (!allowed) return;
    }

    injectAuthIntoRegistrationRequest();
    protectLinksToRegistration();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => start().catch(error => console.error("Auth bridge failed:", error)));
  } else {
    start().catch(error => console.error("Auth bridge failed:", error));
  }
})();
