(() => {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.publishableKey) {
    console.error("Supabase registration: configuration is missing.");
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  window.CODEX_SUPABASE_REGISTRATION = { client };

  const getValue = (form, name) => form.querySelector(`[name="${name}"]`)?.value?.trim() || "";
  const getTeamSize = (form) => Number(form.querySelector('[name="teamSize"]:checked')?.value || 2);

  function setSubmittingState(button, submitting) {
    if (!button) return;
    button.disabled = submitting;
    button.innerHTML = submitting
      ? "Submitting Registration..."
      : 'Submit Registration <span>✓</span>';
  }

  function showError(message) {
    if (typeof window.showStatus === "function") window.showStatus(message, true);
    else console.error("Registration error:", message);
  }

  async function uploadReceipt(file, userId) {
    if (!file) throw new Error("Please upload your payment receipt.");

    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      throw new Error("Please upload a JPG, PNG or PDF payment receipt.");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Payment receipt must be 10MB or smaller.");
    }

    const extension = (file.name.split(".").pop() || "file").toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await client.storage
      .from("registration-receipts")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (error) throw new Error(`Receipt upload failed: ${error.message}`);
    return path;
  }

  async function submitToSupabase(form) {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Authentication check failed: ${sessionError.message}`);

    const user = sessionData?.session?.user;
    if (!user) throw new Error("Your Google login session has expired. Please sign in again.");

    const teamSize = getTeamSize(form);
    const leaderEmail = (user.email || getValue(form, "m1_email")).trim().toLowerCase();

    if (!leaderEmail) throw new Error("Unable to determine the authenticated email.");

    // Fast duplicate check for the currently authenticated account.
    const { data: existing, error: existingError } = await client
      .from("registrations")
      .select("registration_id,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      // A missing SELECT policy should not silently turn into an Apps Script fallback.
      console.warn("Duplicate pre-check unavailable:", existingError.message);
    }

    if (existing?.registration_id) {
      const error = new Error("This Google account has already been used for a CODEX 4.0 registration.");
      error.code = "DUPLICATE_REGISTRATION";
      error.registrationId = existing.registration_id;
      throw error;
    }

    const receiptInput = form.querySelector("#receipt");
    const receiptFile = receiptInput?.files?.[0];
    const receiptPath = await uploadReceipt(receiptFile, user.id);

    const data = {
      team_name: getValue(form, "teamName"),
      team_size: teamSize,
      college_name: getValue(form, "collegeName"),
      leader_email: leaderEmail,
      user_id: user.id,
      member1_name: getValue(form, "m1_name"),
      member1_roll: getValue(form, "m1_roll"),
      member1_email: getValue(form, "m1_email").toLowerCase(),
      member1_phone: getValue(form, "m1_phone"),
      member1_year: getValue(form, "m1_year"),
      member1_branch: getValue(form, "m1_branch"),
      member1_section: getValue(form, "m1_section"),
      member2_name: getValue(form, "m2_name"),
      member2_roll: getValue(form, "m2_roll"),
      member2_email: getValue(form, "m2_email").toLowerCase(),
      member2_phone: getValue(form, "m2_phone"),
      member2_year: getValue(form, "m2_year"),
      member2_branch: getValue(form, "m2_branch"),
      member2_section: getValue(form, "m2_section"),
      member3_name: teamSize === 3 ? getValue(form, "m3_name") : null,
      member3_roll: teamSize === 3 ? getValue(form, "m3_roll") : null,
      member3_email: teamSize === 3 ? getValue(form, "m3_email").toLowerCase() : null,
      member3_phone: teamSize === 3 ? getValue(form, "m3_phone") : null,
      member3_year: teamSize === 3 ? getValue(form, "m3_year") : null,
      member3_branch: teamSize === 3 ? getValue(form, "m3_branch") : null,
      member3_section: teamSize === 3 ? getValue(form, "m3_section") : null,
      payment_amount: 300,
      transaction_id: getValue(form, "utr"),
      receipt_url: receiptPath,
      status: "Pending"
    };

    const { data: inserted, error: insertError } = await client
      .from("registrations")
      .insert(data)
      .select("registration_id,created_at,status")
      .single();

    if (insertError) {
      // Remove the just-uploaded receipt if the database rejected the registration.
      await client.storage.from("registration-receipts").remove([receiptPath]);

      if (insertError.code === "23505") {
        throw new Error("This Google account or email has already been used for a CODEX 4.0 registration.");
      }
      throw new Error(`Registration could not be saved: ${insertError.message}`);
    }

    return {
      ...Object.fromEntries(new FormData(form).entries()),
      registrationId: inserted.registration_id,
      status: inserted.status || "Pending",
      receipt_url: receiptPath,
      user_id: user.id
    };
  }

  async function handleSubmit(event) {
    const form = event.currentTarget;
    if (form.dataset.supabaseSubmitting === "true") return;

    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user) return;

    // Capture-phase handler runs before the legacy Apps Script submit listener.
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (typeof window.checkYearConstraints === "function" && !window.checkYearConstraints()) return;
    if (typeof window.checkContactUniqueness === "function" && !window.checkContactUniqueness()) return;

    const submitBtn = document.getElementById("submitBtn");
    form.dataset.supabaseSubmitting = "true";
    setSubmittingState(submitBtn, true);

    try {
      if (typeof window.showStatus === "function") {
        window.showStatus("Saving registration securely to Supabase...", false);
      }

      const result = await submitToSupabase(form);
      sessionStorage.setItem("codex-existing-reg", JSON.stringify(result));
      sessionStorage.setItem("codex-auth-email", result.member1_email || result.leader_email || "");

      if (typeof window.showSuccess === "function") {
        window.showSuccess(result);
      }

      const regId = document.getElementById("passRegId");
      if (regId) {
        regId.textContent = result.registrationId || "-";
        regId.classList.add("highlight-pulse");
      }
    } catch (error) {
      console.error("Supabase registration submission error:", error);
      showError(error.message || "Unable to submit registration. Please try again.");
      setSubmittingState(submitBtn, false);
    } finally {
      form.dataset.supabaseSubmitting = "false";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registrationForm");
    if (!form) return;
    form.addEventListener("submit", handleSubmit, true);
  });
})();
