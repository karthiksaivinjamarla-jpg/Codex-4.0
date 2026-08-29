const SUPABASE_URL =
  window.CODEX_SUPABASE_CONFIG?.url ||
  "https://lrwrqerurimwzalhjffa.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  window.CODEX_SUPABASE_CONFIG?.publishableKey ||
  "sb_publishable_QRbFkE9mkgIljLF-1zMgGw_f4Ic5OBW";

const AUTH_CONFIG = {
  REGISTRATION_URL: "./register.html",
  AUTH_PAGE_URL: "./auth.html",
  SESSION_HINT_KEY: "codex-auth-ready",
  USER_EMAIL_KEY: "codex-auth-email",
  EXISTING_REG_KEY: "codex-existing-reg"
};

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(
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

let redirectTimer = null;

/* =========================================================
   UI HELPERS
========================================================= */

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
    button.textContent =
      button.dataset.originalText || "CONTINUE";
  }
}

/* =========================================================
   URL / REDIRECT HELPERS
========================================================= */

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

      if (
        decoded.startsWith("/") ||
        decoded.startsWith("./") ||
        decoded.includes("register.html")
      ) {
        return decoded;
      }
    } catch (_) {}
  }

  return AUTH_CONFIG.REGISTRATION_URL;
}

/* =========================================================
   AUTH ERROR HANDLING
========================================================= */

function checkUrlForAuthErrors() {
  const url = new URL(window.location.href);

  const hashParams = new URLSearchParams(
    window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : ""
  );

  const queryParams = url.searchParams;

  const error =
    hashParams.get("error") ||
    queryParams.get("error");

  const errorDescription =
    hashParams.get("error_description") ||
    queryParams.get("error_description");

  if (error || errorDescription) {
    console.error("OAuth redirect returned error:", {
      error,
      errorDescription
    });

    const msg = errorDescription
      ? decodeURIComponent(
          errorDescription.replace(/\+/g, " ")
        )
      : `Authentication error (${error}). Please try again.`;

    showMessage(msg, "error");

    if (window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname +
          window.location.search
      );
    }

    return true;
  }

  return false;
}

/* =========================================================
   SUPABASE AUTH HELPERS
========================================================= */

async function getSession() {
  if (!supabaseClient) return null;

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) throw error;

  return data.session || null;
}

async function getVerifiedUser() {
  if (!supabaseClient) {
    throw new Error(
      "Supabase authentication is not configured."
    );
  }

  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) throw error;

  return data.user || null;
}

/* =========================================================
   SUPABASE REGISTRATION CHECK
========================================================= */

/*
 * Checks whether the currently authenticated Google account
 * already has a registration in public.registrations.
 *
 * IMPORTANT:
 * We use user_id instead of email because the database has:
 *
 * registrations.user_id = auth.uid()
 *
 * and a unique index on user_id.
 */

async function checkSupabaseRegistration(user) {
  if (!supabaseClient) {
    throw new Error(
      "Supabase authentication is not configured."
    );
  }

  if (!user?.id) {
    throw new Error(
      "Unable to determine the authenticated user."
    );
  }

  const { data, error } = await supabaseClient
    .from("registrations")
    .select(`
      registration_id,
      user_id,
      leader_email,
      team_name,
      team_size,
      college_name,
      member1_name,
      member1_roll,
      member1_email,
      member1_phone,
      member1_year,
      member1_branch,
      member1_section,
      member2_name,
      member2_roll,
      member2_email,
      member2_phone,
      member2_year,
      member2_branch,
      member2_section,
      member3_name,
      member3_roll,
      member3_email,
      member3_phone,
      member3_year,
      member3_branch,
      member3_section,
      payment_amount,
      transaction_id,
      receipt_url,
      status,
      created_at
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    /*
     * PGRST116 means no row was found by maybeSingle().
     * We normally shouldn't receive it, but treating it as
     * "not registered" keeps this function safe.
     */
    if (error.code === "PGRST116") {
      return {
        exists: false,
        data: null
      };
    }

    throw error;
  }

  if (!data) {
    return {
      exists: false,
      data: null
    };
  }

  /*
   * Convert database column names back to the names expected
   * by register.html / script.js.
   */
  const registrationData = {
    registrationId: data.registration_id,
    user_id: data.user_id,

    leader_email: data.leader_email,

    teamName: data.team_name,
    teamSize: String(data.team_size || 2),
    collegeName: data.college_name,

    m1_name: data.member1_name,
    m1_roll: data.member1_roll,
    m1_email: data.member1_email,
    m1_phone: data.member1_phone,
    m1_year: data.member1_year,
    m1_branch: data.member1_branch,
    m1_section: data.member1_section,

    m2_name: data.member2_name,
    m2_roll: data.member2_roll,
    m2_email: data.member2_email,
    m2_phone: data.member2_phone,
    m2_year: data.member2_year,
    m2_branch: data.member2_branch,
    m2_section: data.member2_section,

    m3_name: data.member3_name,
    m3_roll: data.member3_roll,
    m3_email: data.member3_email,
    m3_phone: data.member3_phone,
    m3_year: data.member3_year,
    m3_branch: data.member3_branch,
    m3_section: data.member3_section,

    payment_amount: data.payment_amount,
    utr: data.transaction_id,
    receipt_url: data.receipt_url,

    status: data.status || "Pending",
    created_at: data.created_at
  };

  return {
    exists: true,
    registrationId: data.registration_id,
    data: registrationData
  };
}

/* =========================================================
   SIGN OUT
========================================================= */

async function signOut() {
  clearMessage();

  if (redirectTimer) {
    clearTimeout(redirectTimer);
  }

  const button =
    document.getElementById("signOutBtn");

  setBusy(button, "SIGNING OUT...", true);

  try {
    sessionStorage.removeItem(
      AUTH_CONFIG.SESSION_HINT_KEY
    );

    sessionStorage.removeItem(
      AUTH_CONFIG.USER_EMAIL_KEY
    );

    sessionStorage.removeItem(
      AUTH_CONFIG.EXISTING_REG_KEY
    );

    if (supabaseClient) {
      const { error } =
        await supabaseClient.auth.signOut();

      if (error) throw error;
    }

    resetUI();

    showMessage(
      "You have signed out successfully.",
      "success"
    );
  } catch (error) {
    console.error("Sign-out error:", error);

    showMessage(
      error.message ||
        "Unable to sign out. Please try again.",
      "error"
    );
  } finally {
    setBusy(button, "SIGN OUT", false);
  }
}

/* =========================================================
   RESET AUTH UI
========================================================= */

function resetUI() {
  document
    .getElementById("methods")
    ?.classList.remove("hidden");

  document
    .getElementById("continueBtn")
    ?.classList.remove("show");

  document
    .getElementById("signOutBtn")
    ?.classList.remove("show");

  document
    .getElementById("already")
    ?.classList.remove("show");

  const emailInput =
    document.getElementById("email");

  if (emailInput) {
    emailInput.value = "";
  }
}

/* =========================================================
   ALREADY REGISTERED
========================================================= */

function showAlreadyRegistered(
  id,
  email,
  data
) {
  sessionStorage.setItem(
    AUTH_CONFIG.SESSION_HINT_KEY,
    "1"
  );

  sessionStorage.setItem(
    AUTH_CONFIG.USER_EMAIL_KEY,
    email || ""
  );

  if (data) {
    sessionStorage.setItem(
      AUTH_CONFIG.EXISTING_REG_KEY,
      JSON.stringify(data)
    );
  }

  document
    .getElementById("methods")
    ?.classList.add("hidden");

  document
    .getElementById("continueBtn")
    ?.classList.remove("show");

  document
    .getElementById("already")
    ?.classList.add("show");

  document
    .getElementById("signOutBtn")
    ?.classList.add("show");

  const idEl =
    document.getElementById("existingId");

  if (idEl) {
    idEl.textContent =
      id || "ALREADY REGISTERED";
  }

  showMessage(
    `You have already registered for CODEX 4.0 (ID: ${id}). Duplicate registrations are not allowed.`,
    "success"
  );

  const viewPassBtn =
    document.getElementById("viewPassBtn");

  if (viewPassBtn) {
    viewPassBtn.onclick = () => {
      window.location.href =
        "./register.html?view=pass";
    };
  }
}

/* =========================================================
   AUTHENTICATED USER
========================================================= */

function showAuthenticated(
  session,
  user
) {
  sessionStorage.setItem(
    AUTH_CONFIG.SESSION_HINT_KEY,
    "1"
  );

  sessionStorage.setItem(
    AUTH_CONFIG.USER_EMAIL_KEY,
    user.email || ""
  );

  /*
   * Make sure old registration data does not
   * accidentally remain from another session.
   */
  sessionStorage.removeItem(
    AUTH_CONFIG.EXISTING_REG_KEY
  );

  document
    .getElementById("methods")
    ?.classList.add("hidden");

  document
    .getElementById("already")
    ?.classList.remove("show");

  document
    .getElementById("continueBtn")
    ?.classList.add("show");

  document
    .getElementById("signOutBtn")
    ?.classList.add("show");

  const targetUrl =
    getTargetRegistrationUrl();

  showMessage(
    `✓ Verified as ${user.email}. Redirecting to registration...`,
    "success"
  );

  if (redirectTimer) {
    clearTimeout(redirectTimer);
  }

  redirectTimer = setTimeout(() => {
    window.location.href = targetUrl;
  }, 1200);
}

/* =========================================================
   AUTH SESSION HANDLER
========================================================= */

async function handleAuthenticatedSession(
  session
) {
  if (!session?.user) return false;

  try {
    const user =
      session.user.email
        ? session.user
        : await getVerifiedUser();

    if (!user?.email) {
      throw new Error(
        "Your authenticated account did not provide an email address."
      );
    }

    const email =
      user.email.trim().toLowerCase();

    showMessage(
      "Checking registration status...",
      "success"
    );

    /*
     * NEW:
     * Check Supabase directly.
     *
     * Google Apps Script is no longer involved.
     */
    try {
      const check =
        await checkSupabaseRegistration(user);

      if (check?.exists) {
        showAlreadyRegistered(
          check.registrationId,
          email,
          check.data
        );

        return true;
      }
    } catch (error) {
      /*
       * IMPORTANT:
       * Unlike the old Apps Script flow, don't silently
       * hide a database/RLS problem.
       */
      console.error(
        "Supabase registration check failed:",
        error
      );

      showMessage(
        "Unable to check your registration status. Please try again.",
        "error"
      );

      return false;
    }

    showAuthenticated(
      session,
      user
    );

    return true;
  } catch (error) {
    console.error(
      "Authentication session check failed:",
      error
    );

    showMessage(
      error.message ||
        "Unable to verify your registration session.",
      "error"
    );

    return false;
  }
}

/* =========================================================
   MAGIC LINK LOGIN
========================================================= */

async function sendMagicLink() {
  clearMessage();

  if (!supabaseClient) {
    showMessage(
      "Supabase authentication is not configured correctly.",
      "error"
    );

    return;
  }

  const email =
    document
      .getElementById("email")
      ?.value
      .trim()
      .toLowerCase();

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    showMessage(
      "Please enter a valid email address.",
      "error"
    );

    return;
  }

  const button =
    document.getElementById("sendMagicLink");

  setBusy(
    button,
    "SENDING LINK...",
    true
  );

  try {
    const redirectTo =
      getRedirectUrl();

    const { error } =
      await supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true
        }
      });

    if (error) throw error;

    showMessage(
      "✓ Login link sent! Check your email inbox and open the link to continue.",
      "success"
    );

    const hint =
      document.getElementById("emailHint");

    if (hint) {
      hint.textContent =
        "Click the link in your email to instantly verify and continue.";
    }
  } catch (error) {
    console.error(
      "Magic link error:",
      error
    );

    showMessage(
      error.message ||
        "Unable to send the login link.",
      "error"
    );
  } finally {
    setBusy(
      button,
      "SEND LOGIN LINK",
      false
    );
  }
}

/* =========================================================
   GOOGLE LOGIN
========================================================= */

async function signInWithGoogle() {
  clearMessage();

  if (window.location.protocol === "file:") {
    showMessage(
      "⚠️ Google Sign-In requires a local web server (e.g. VS Code Live Server or 'python -m http.server'). It cannot run directly from a file:// URL.",
      "error"
    );

    return;
  }

  if (!supabaseClient) {
    showMessage(
      "Supabase authentication client is not available. Please refresh the page.",
      "error"
    );

    return;
  }

  const button =
    document.getElementById("googleButton");

  setBusy(
    button,
    "OPENING GOOGLE...",
    true
  );

  try {
    const redirectTo =
      getRedirectUrl();

    console.log(
      "Starting Google OAuth with redirectTo:",
      redirectTo
    );

    const { data, error } =
      await supabaseClient.auth.signInWithOAuth({
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
      window.location.href =
        data.url;
    }
  } catch (error) {
    console.error(
      "Google sign-in error:",
      error
    );

    showMessage(
      error.message ||
        "Google sign-in failed. Please try again.",
      "error"
    );

    setBusy(
      button,
      "CONTINUE WITH GOOGLE",
      false
    );
  }
}

/* =========================================================
   CONTINUE
========================================================= */

function continueToRegistration() {
  if (redirectTimer) {
    clearTimeout(redirectTimer);
  }

  const targetUrl =
    getTargetRegistrationUrl();

  window.location.href =
    targetUrl;
}

/* =========================================================
   EVENT INITIALIZATION
========================================================= */

function initAuthEvents() {
  document
    .getElementById("sendMagicLink")
    ?.addEventListener(
      "click",
      sendMagicLink
    );

  document
    .getElementById("googleButton")
    ?.addEventListener(
      "click",
      signInWithGoogle
    );

  document
    .getElementById("continueBtn")
    ?.addEventListener(
      "click",
      continueToRegistration
    );

  document
    .getElementById("signOutBtn")
    ?.addEventListener(
      "click",
      signOut
    );

  document
    .getElementById("email")
    ?.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          sendMagicLink();
        }
      }
    );
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initAuthEvents();

    if (
      window.location.protocol === "file:"
    ) {
      showMessage(
        "ℹ️ Note: Running via local file protocol. For Google Sign-In, please run using a local server (e.g. Live Server on port 5500 / 8000).",
        "error"
      );
    }

    if (checkUrlForAuthErrors()) {
      return;
    }

    if (!supabaseClient) {
      showMessage(
        "Supabase authentication is not configured. Please contact the event team.",
        "error"
      );

      return;
    }

    /*
     * Listen for Supabase authentication changes.
     */
    supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log(
          "Supabase Auth Event:",
          event
        );

        if (
          (
            event === "SIGNED_IN" ||
            event === "INITIAL_SESSION" ||
            event === "TOKEN_REFRESHED"
          ) &&
          session?.user
        ) {
          await handleAuthenticatedSession(
            session
          );
        } else if (
          event === "SIGNED_OUT"
        ) {
          sessionStorage.removeItem(
            AUTH_CONFIG.SESSION_HINT_KEY
          );

          sessionStorage.removeItem(
            AUTH_CONFIG.USER_EMAIL_KEY
          );

          sessionStorage.removeItem(
            AUTH_CONFIG.EXISTING_REG_KEY
          );

          resetUI();
        }
      }
    );

    /*
     * Check for an existing session when the
     * page initially loads.
     */
    try {
      const session =
        await getSession();

      if (session?.user) {
        await handleAuthenticatedSession(
          session
        );
      }
    } catch (error) {
      console.error(
        "Initial auth check failed:",
        error
      );

      showMessage(
        error.message ||
          "Unable to initialize authentication.",
        "error"
      );
    }
  }
);