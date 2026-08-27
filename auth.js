const SUPABASE_URL = window.CODEX_SUPABASE_CONFIG?.url || "";
const SUPABASE_PUBLISHABLE_KEY = window.CODEX_SUPABASE_CONFIG?.publishableKey || "";
const AUTH_CONFIG = {
  REGISTRATION_URL: "./register.html",
  SESSION_HINT_KEY: "codex-auth-ready"
};

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

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

function showAlreadyRegistered(id) {
  document.getElementById("methods")?.classList.add("hidden");
  document.getElementById("continueBtn")?.classList.remove("show");
  document.getElementById("already")?.classList.add("show");
  const idEl = document.getElementById("existingId");
  if (idEl) idEl.textContent = id || "ALREADY REGISTERED";
  showMessage("This account has already been used for a CODEX 4.0 registration.", "error");
}

function showAuthenticated(session, user) {
  sessionStorage.setItem(AUTH_CONFIG.SESSION_HINT_KEY, "1");
  sessionStorage.setItem("codex-auth-email", user.email || "");
  document.getElementById("methods")?.classList.add("hidden");
  document.getElementById("continueBtn")?.classList.add("show");
  showMessage(`✓ Verified as ${user.email}. You can continue to registration.`, "success");
}

async function handleAuthenticatedSession(session) {
  if (!session) return false;
  try {
    const user = await getVerifiedUser();
    if (!user?.email) throw new Error("Your authenticated account did not provide an email address.");
    showAuthenticated(session, user);
    return true;
  } catch (error) {
    console.error("Authentication session check failed:", error);
    showMessage(error.message || "Unable to verify your registration session.");
    return false;
  }
}

async function sendMagicLink() {
  clearMessage();
  if (!supabaseClient) { showMessage("Supabase authentication is not configured correctly."); return; }

  const email = document.getElementById("email")?.value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMessage("Please enter a valid email address."); return; }

  const button = document.getElementById("sendMagicLink");
  setBusy(button, "SENDING LINK...", true);

  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
    });
    if (error) throw error;
    showMessage("✓ Login link sent. Check your email and open the link to continue.", "success");
    const hint = document.getElementById("emailHint");
    if (hint) hint.textContent = "The secure link expires according to your Supabase Email OTP Expiration setting.";
  } catch (error) {
    console.error("Magic link error:", error);
    showMessage(error.message || "Unable to send the login link.");
  } finally {
    setBusy(button, "SEND LOGIN LINK", false);
  }
}

async function signInWithGoogle() {
  clearMessage();
  if (!supabaseClient) { showMessage("Supabase authentication is not configured correctly."); return; }

  const button = document.getElementById("googleButton");
  setBusy(button, "OPENING GOOGLE...", true);
  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) throw error;
  } catch (error) {
    console.error("Google sign-in error:", error);
    showMessage(error.message || "Google sign-in failed.");
    setBusy(button, "CONTINUE WITH GOOGLE", false);
  }
}

async function continueToRegistration() {
  clearMessage();
  try {
    const session = await getSession();
    if (!session) { showMessage("Please verify your account before continuing."); return; }

    const user = await getVerifiedUser();
    if (!user?.email) { showMessage("Your authenticated account did not provide an email address."); return; }

    sessionStorage.setItem(AUTH_CONFIG.SESSION_HINT_KEY, "1");
    sessionStorage.setItem("codex-auth-email", user.email || "");
    window.location.href = AUTH_CONFIG.REGISTRATION_URL;
  } catch (error) {
    console.error("Unable to continue to registration:", error);
    showMessage(error.message || "Unable to continue. Please sign in again.");
  }
}

function initAuthEvents() {
  document.getElementById("sendMagicLink")?.addEventListener("click", sendMagicLink);
  document.getElementById("googleButton")?.addEventListener("click", signInWithGoogle);
  document.getElementById("continueBtn")?.addEventListener("click", continueToRegistration);
  document.getElementById("email")?.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); sendMagicLink(); }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) { showMessage("Supabase authentication is not configured. Please contact the event team."); return; }

  initAuthEvents();
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) setTimeout(() => handleAuthenticatedSession(session), 0);
    if (event === "SIGNED_OUT") {
      sessionStorage.removeItem(AUTH_CONFIG.SESSION_HINT_KEY);
      sessionStorage.removeItem("codex-auth-email");
    }
  });

  try {
    const session = await getSession();
    if (session) await handleAuthenticatedSession(session);
  } catch (error) {
    console.error("Initial auth check failed:", error);
    showMessage(error.message || "Unable to initialize authentication.");
  }
});
