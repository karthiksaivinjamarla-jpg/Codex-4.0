const SUPABASE_URL = window.CODEX_SUPABASE_CONFIG?.url || "https://lrwrqerurimwzalhjffa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = window.CODEX_SUPABASE_CONFIG?.publishableKey || "sb_publishable_QRbFkE9mkgIljLF-1zMgGw_f4Ic5OBW";

const AUTH_CONFIG = {
  REGISTRATION_URL: "./register.html",
  AUTH_PAGE_URL: "./auth.html",
  SESSION_HINT_KEY: "codex-auth-ready",
  USER_EMAIL_KEY: "codex-auth-email"
};

let supabaseClient = null;
if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

let redirectTimer = null;

function showMessage(text, type = "error") {
  const el = document.getElementById("message");
  if (!el) return;
  el.textContent = text;
  el.className = `message show ${type}`;
}

function clearMessage() {
  const el = document.getElementById("message");
  if (el) el.className = "message";
}

function setBusy(button, busyText, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || "CONTINUE";
  }
}

function getRedirectUrl() {
  if (window.location.protocol === "file:") {
    return "http://localhost:5500/auth.html";
  }
  const url = new URL(window.location.href);
  const returnParam = url.searchParams.get("return");
  const redirect = new URL(url.pathname, url.origin);
  if (returnParam) {
    redirect.searchParams.set("return", returnParam);
  }
  return redirect.toString();
}

function getTargetRegistrationUrl() {
  const params = new URLSearchParams(window.location.search);
  const returnParam = params.get("return");
  if (returnParam) {
    try {
      const decoded = decodeURIComponent(returnParam);
      if (decoded.startsWith("/") || decoded.startsWith("./") || decoded.includes("register.html")) {
        return decoded;
      }
    } catch (_) {}
  }
  return AUTH_CONFIG.REGISTRATION_URL;
}

function checkUrlForAuthErrors() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.startsWith("#") ? window.location.hash.substring(1) : "");
  const queryParams = url.searchParams;

  const error = hashParams.get("error") || queryParams.get("error");
  const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

  if (error || errorDescription) {
    console.error("OAuth redirect returned error:", { error, errorDescription });
    const msg = errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
      : `Authentication error (${error}). Please try again.`;
    showMessage(msg, "error");

    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return true;
  }
  return false;
}

async function getSession() {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

async function getVerifiedUser() {
  if (!supabaseClient) throw new Error("Supabase authentication is not configured.");
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return data.user || null;
}

async function signOut() {
  clearMessage();
  if (redirectTimer) clearTimeout(redirectTimer);

  const button = document.getElementById("signOutBtn");
  setBusy(button, "SIGNING OUT...", true);

  try {
    sessionStorage.removeItem(AUTH_CONFIG.SESSION_HINT_KEY);
    sessionStorage.removeItem(AUTH_CONFIG.USER_EMAIL_KEY);
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    resetUI();
    showMessage("You have signed out successfully.", "success");
  } catch (error) {
    console.error("Sign-out error:", error);
    showMessage(error.message || "Unable to sign out. Please try again.", "error");
  } finally {
    setBusy(button, "SIGN OUT", false);
  }
}

function resetUI() {
  document.getElementById("methods")?.classList.remove("hidden");
  document.getElementById("continueBtn")?.classList.remove("show");
  document.getElementById("signOutBtn")?.classList.remove("show");
  document.getElementById("already")?.classList.remove("show");
  const emailInput = document.getElementById("email");
  if (emailInput) emailInput.value = "";
}

const BACKEND_API_URL = "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec";

function checkBackendRegistration(accessToken, email) {
  return new Promise((resolve) => {
    const callbackName = "checkRegCallback_" + Math.random().toString(36).slice(2, 9);
    const scriptId = "jsonp_check_reg";
    const oldScript = document.getElementById(scriptId);
    if (oldScript) oldScript.remove();

    const timeout = setTimeout(() => {
      delete window[callbackName];
      document.getElementById(scriptId)?.remove();
      resolve({ success: false, timeout: true });
    }, 6000);

    window[callbackName] = function(res) {
      clearTimeout(timeout);
      delete window[callbackName];
      document.getElementById(scriptId)?.remove();
      resolve(res);
    };

    const script = document.createElement("script");
    script.id = scriptId;
    // Prefer secure token verification; fall back to email if no token
    const params = accessToken
      ? `accessToken=${encodeURIComponent(accessToken)}`
      : `email=${encodeURIComponent(email)}`;
    script.src = `${BACKEND_API_URL}?action=checkRegistration&${params}&callback=${callbackName}&_t=${Date.now()}`;
    script.onerror = function() {
      clearTimeout(timeout);
      delete window[callbackName];
      document.getElementById(scriptId)?.remove();
      resolve({ success: false });
    };
    document.body.appendChild(script);
  });
}

function showAlreadyRegistered(id, email, data) {
  sessionStorage.setItem(AUTH_CONFIG.SESSION_HINT_KEY, "1");
  sessionStorage.setItem(AUTH_CONFIG.USER_EMAIL_KEY, email || "");
  if (data) {
    sessionStorage.setItem("codex-existing-reg", JSON.stringify(data));
  }

  document.getElementById("methods")?.classList.add("hidden");
  document.getElementById("continueBtn")?.classList.remove("show");
  document.getElementById("already")?.classList.add("show");
  document.getElementById("signOutBtn")?.classList.add("show");

  const idEl = document.getElementById("existingId");
  if (idEl) idEl.textContent = id || "ALREADY REGISTERED";

  showMessage(`You have already registered for CODEX 4.0 (ID: ${id}). Duplicate registrations are not allowed.`, "success");

  const viewPassBtn = document.getElementById("viewPassBtn");
  if (viewPassBtn) {
    viewPassBtn.onclick = () => {
      window.location.href = "./register.html?view=pass";
    };
  }
}

function showAuthenticated(session, user) {
  sessionStorage.setItem(AUTH_CONFIG.SESSION_HINT_KEY, "1");
  sessionStorage.setItem(AUTH_CONFIG.USER_EMAIL_KEY, user.email || "");

  document.getElementById("methods")?.classList.add("hidden");
  document.getElementById("already")?.classList.remove("show");
  document.getElementById("continueBtn")?.classList.add("show");
  document.getElementById("signOutBtn")?.classList.add("show");

  const targetUrl = getTargetRegistrationUrl();
  showMessage(`✓ Verified as ${user.email}. Redirecting to registration...`, "success");

  if (redirectTimer) clearTimeout(redirectTimer);
  redirectTimer = setTimeout(() => {
    window.location.href = targetUrl;
  }, 1200);
}

async function handleAuthenticatedSession(session) {
  if (!session?.user) return false;
  try {
    const user = session.user.email ? session.user : await getVerifiedUser();
    if (!user?.email) throw new Error("Your authenticated account did not provide an email address.");

    const email = user.email.trim().toLowerCase();
    const accessToken = session.access_token || null;
    showMessage("Checking registration status...", "success");

    // Check if user already registered in backend Google Sheet
    try {
      const check = await checkBackendRegistration(accessToken, email);
      if (check && check.exists) {
        showAlreadyRegistered(check.registrationId, email, check.data);
        return true;
      }
    } catch (e) {
      console.warn("Backend registration check error:", e);
      // On timeout/error, allow user to proceed — backend will still block duplicates on submit
    }

    showAuthenticated(session, user);
    return true;
  } catch (error) {
    console.error("Authentication session check failed:", error);
    showMessage(error.message || "Unable to verify your registration session.", "error");
    return false;
  }
}

async function sendMagicLink() {
  clearMessage();
  if (!supabaseClient) {
    showMessage("Supabase authentication is not configured correctly.", "error");
    return;
  }

  const email = document.getElementById("email")?.value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage("Please enter a valid email address.", "error");
    return;
  }

  const button = document.getElementById("sendMagicLink");
  setBusy(button, "SENDING LINK...", true);

  try {
    const redirectTo = getRedirectUrl();
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
    });
    if (error) throw error;
    showMessage("✓ Login link sent! Check your email inbox and open the link to continue.", "success");
    const hint = document.getElementById("emailHint");
    if (hint) hint.textContent = "Click the link in your email to instantly verify and continue.";
  } catch (error) {
    console.error("Magic link error:", error);
    showMessage(error.message || "Unable to send the login link.", "error");
  } finally {
    setBusy(button, "SEND LOGIN LINK", false);
  }
}

async function signInWithGoogle() {
  clearMessage();

  if (window.location.protocol === "file:") {
    showMessage("⚠️ Google Sign-In requires a local web server (e.g. VS Code Live Server or 'python -m http.server'). It cannot run directly from a file:// URL.", "error");
    return;
  }

  if (!supabaseClient) {
    showMessage("Supabase authentication client is not available. Please refresh the page.", "error");
    return;
  }

  const button = document.getElementById("googleButton");
  setBusy(button, "OPENING GOOGLE...", true);

  try {
    const redirectTo = getRedirectUrl();
    console.log("Starting Google OAuth with redirectTo:", redirectTo);

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    });

    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    showMessage(error.message || "Google sign-in failed. Please try again.", "error");
    setBusy(button, "CONTINUE WITH GOOGLE", false);
  }
}

function continueToRegistration() {
  if (redirectTimer) clearTimeout(redirectTimer);
  const targetUrl = getTargetRegistrationUrl();
  window.location.href = targetUrl;
}

function initAuthEvents() {
  document.getElementById("sendMagicLink")?.addEventListener("click", sendMagicLink);
  document.getElementById("googleButton")?.addEventListener("click", signInWithGoogle);
  document.getElementById("continueBtn")?.addEventListener("click", continueToRegistration);
  document.getElementById("signOutBtn")?.addEventListener("click", signOut);
  document.getElementById("email")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMagicLink();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initAuthEvents();

  if (window.location.protocol === "file:") {
    showMessage("ℹ️ Note: Running via local file protocol. For Google Sign-In, please run using a local server (e.g. Live Server on port 5500 / 8000).", "error");
  }

  if (checkUrlForAuthErrors()) {
    return;
  }

  if (!supabaseClient) {
    showMessage("Supabase authentication is not configured. Please contact the event team.", "error");
    return;
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Supabase Auth Event:", event);
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
      handleAuthenticatedSession(session);
    } else if (event === "SIGNED_OUT") {
      sessionStorage.removeItem(AUTH_CONFIG.SESSION_HINT_KEY);
      sessionStorage.removeItem(AUTH_CONFIG.USER_EMAIL_KEY);
      resetUI();
    }
  });

  try {
    const session = await getSession();
    if (session?.user) {
      await handleAuthenticatedSession(session);
    }
  } catch (error) {
    console.error("Initial auth check failed:", error);
  }
});

