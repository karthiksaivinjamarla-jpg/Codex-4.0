const AUTH_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",
  REGISTRATION_URL: "./register.html",
  AUTH_TOKEN_KEY: "codex-auth-token",
  AUTH_EMAIL_KEY: "codex-auth-email",
  GOOGLE_CLIENT_ID: ""
};

let otpCooldownTimer = null;

function jsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = "codexAuthCallback_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const script = document.createElement("script");
    const query = new URLSearchParams({ action, callback: callbackName, _t: Date.now(), ...params });
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Authentication server did not respond. Please try again."));
    }, 20000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to connect to the authentication server."));
    };

    script.src = `${AUTH_CONFIG.API_URL}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

async function postAuth(action, payload) {
  // Apps Script web apps do not provide a browser-readable CORS response
  // for this deployment, so auth responses use the same JSONP-compatible
  // GET service pattern as the existing Registration-ID lookup.
  return jsonp(action, payload);
}

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

function showAlreadyRegistered(id) {
  document.getElementById("methods")?.classList.add("hidden");
  document.getElementById("already")?.classList.add("show");
  const idEl = document.getElementById("existingId");
  if (idEl) idEl.textContent = id || "ALREADY REGISTERED";
  showMessage("This email has already been used for a CODEX 4.0 registration.", "error");
}

function startCooldown(seconds) {
  const button = document.getElementById("sendOtp");
  const hint = document.getElementById("otpHint");
  let remaining = Number(seconds) || 60;
  if (button) button.disabled = true;

  clearInterval(otpCooldownTimer);
  otpCooldownTimer = setInterval(() => {
    remaining -= 1;
    if (hint) hint.textContent = `You can request another OTP in ${remaining}s.`;
    if (remaining <= 0) {
      clearInterval(otpCooldownTimer);
      otpCooldownTimer = null;
      if (button) {
        button.disabled = false;
        button.textContent = "SEND OTP AGAIN";
      }
      if (hint) hint.textContent = "You can request a new OTP if needed.";
    }
  }, 1000);
}

function saveAuth(token, email) {
  sessionStorage.setItem(AUTH_CONFIG.AUTH_TOKEN_KEY, token);
  sessionStorage.setItem(AUTH_CONFIG.AUTH_EMAIL_KEY, email);
}

function continueToRegistration() {
  window.location.href = AUTH_CONFIG.REGISTRATION_URL;
}

function handleVerified(result) {
  if (result.alreadyRegistered) {
    showAlreadyRegistered(result.registrationId);
    return;
  }

  if (!result.success || !result.authToken) {
    showMessage(result.message || "Verification failed. Please try again.");
    return;
  }

  saveAuth(result.authToken, result.email);
  showMessage(`✓ ${result.message || "Verification successful."}`, "success");
  document.getElementById("methods")?.classList.add("hidden");
  document.getElementById("continueBtn")?.classList.add("show");
}

async function sendOtp() {
  clearMessage();
  const email = document.getElementById("email")?.value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage("Please enter a valid email address.");
    return;
  }

  const button = document.getElementById("sendOtp");
  if (button) {
    button.disabled = true;
    button.textContent = "SENDING OTP...";
  }

  try {
    const result = await postAuth("sendOtp", { email });
    if (result.alreadyRegistered) {
      showAlreadyRegistered(result.registrationId);
      return;
    }
    if (result.cooldown) {
      showMessage(result.message || "Please wait before requesting another OTP.");
      startCooldown(result.retryAfter || 60);
      return;
    }
    if (!result.success) {
      showMessage(result.message || "Unable to send OTP.");
      if (button) {
        button.disabled = false;
        button.textContent = "SEND OTP";
      }
      return;
    }

    document.getElementById("otpSection")?.classList.remove("hidden");
    document.getElementById("otp")?.focus();
    showMessage("✓ OTP sent. Check your email.", "success");
    startCooldown(result.retryAfter || 60);
    const hint = document.getElementById("otpHint");
    if (hint) hint.textContent = "The OTP expires in 10 minutes.";
  } catch (error) {
    showMessage(error.message || "Unable to send OTP.");
    if (button) {
      button.disabled = false;
      button.textContent = "SEND OTP";
    }
  }
}

async function verifyOtp() {
  clearMessage();
  const email = document.getElementById("email")?.value.trim().toLowerCase();
  const otp = document.getElementById("otp")?.value.trim();

  if (!email || !/^\d{6}$/.test(otp || "")) {
    showMessage("Enter the 6-digit OTP sent to your email.");
    return;
  }

  const button = document.getElementById("verifyOtp");
  if (button) {
    button.disabled = true;
    button.textContent = "VERIFYING...";
  }

  try {
    const result = await postAuth("verifyOtp", { email, otp });
    handleVerified(result);
  } catch (error) {
    showMessage(error.message || "Unable to verify OTP.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "VERIFY";
    }
  }
}

function initGoogle(clientId) {
  const googleSection = document.getElementById("googleSection");
  const button = document.getElementById("googleButton");

  if (!clientId || !window.google?.accounts?.id) {
    if (googleSection) googleSection.classList.add("hidden");
    return;
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: async (response) => {
      clearMessage();
      try {
        showMessage("Verifying your Google account...", "success");
        const result = await postAuth("googleAuth", { credential: response.credential });
        handleVerified(result);
      } catch (error) {
        showMessage(error.message || "Google sign-in failed.");
      }
    }
  });

  window.google.accounts.id.renderButton(button, {
    type: "standard",
    theme: document.body.classList.contains("light") ? "outline" : "filled_black",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: 360
  });
}

async function loadGoogleConfig() {
  if (AUTH_CONFIG.GOOGLE_CLIENT_ID) {
    initGoogle(AUTH_CONFIG.GOOGLE_CLIENT_ID);
    return;
  }

  try {
    const result = await jsonp("authConfig", {});
    if (result.googleEnabled && result.googleClientId) {
      const waitForGoogle = () => {
        if (window.google?.accounts?.id) initGoogle(result.googleClientId);
        else setTimeout(waitForGoogle, 100);
      };
      waitForGoogle();
    } else {
      document.getElementById("googleSection")?.classList.add("hidden");
    }
  } catch (_) {
    document.getElementById("googleSection")?.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const existingToken = sessionStorage.getItem(AUTH_CONFIG.AUTH_TOKEN_KEY);
  if (existingToken) {
    document.getElementById("continueBtn")?.classList.add("show");
    showMessage("You already have a verified registration session.", "success");
  }

  document.getElementById("sendOtp")?.addEventListener("click", sendOtp);
  document.getElementById("verifyOtp")?.addEventListener("click", verifyOtp);
  document.getElementById("continueBtn")?.addEventListener("click", continueToRegistration);

  document.getElementById("otp")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
  });

  loadGoogleConfig();
});
