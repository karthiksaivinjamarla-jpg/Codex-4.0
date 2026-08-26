(function () {
  const TOKEN_KEY = "codex-auth-token";
  const EMAIL_KEY = "codex-auth-email";
  const AUTH_PAGE = "./auth.html";
  const REGISTER_PAGE = "register.html";

  function isRegistrationPage() {
    return /(^|\/)register\.html$/i.test(window.location.pathname);
  }

  function redirectToAuth() {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.replace(`${AUTH_PAGE}?return=${returnUrl}`);
  }

  function guardRegistrationPage() {
    if (!isRegistrationPage()) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    const email = sessionStorage.getItem(EMAIL_KEY);
    if (!token || !email) redirectToAuth();
  }

  function injectAuthIntoRegistrationRequest() {
    if (!isRegistrationPage()) return;

    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      const token = sessionStorage.getItem(TOKEN_KEY);

      if (!token || !url.includes("script.google.com/macros")) {
        return originalFetch.apply(this, arguments);
      }

      if (!init || typeof init.body !== "string") {
        return originalFetch.apply(this, arguments);
      }

      try {
        const body = JSON.parse(init.body);
        if (!body.authToken) body.authToken = token;
        init.body = JSON.stringify(body);
      } catch (_) {}

      return originalFetch.call(this, input, init);
    };
  }

  function protectLinksToRegistration() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!/(^|\/)register\.html(?:[?#]|$)/i.test(href)) return;

      event.preventDefault();
      const token = sessionStorage.getItem(TOKEN_KEY);
      const email = sessionStorage.getItem(EMAIL_KEY);
      if (token && email) window.location.href = href;
      else window.location.href = AUTH_PAGE;
    });
  }

  function start() {
    guardRegistrationPage();
    injectAuthIntoRegistrationRequest();
    protectLinksToRegistration();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
