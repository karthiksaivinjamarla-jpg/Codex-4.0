// js/payments/razorpay.js
// Frontend Razorpay Checkout integration.
//
// Security model:
//  - NEVER creates a Razorpay Order directly (no secret key here).
//  - Calls /api/razorpay/create-order to get an order from the server.
//  - Sends payment response to /api/razorpay/verify-payment for server-side verification.
//  - Only calls showSuccess() AFTER server confirms verification.
//  - Guards against double-clicks and duplicate submissions.

(function () {
  "use strict";

  const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

  let _paying = false; // Global lock to prevent double-submission.

  // ---------------------------------------------------------------
  // Load the Razorpay Checkout script dynamically (only once).
  // ---------------------------------------------------------------
  function loadCheckoutScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load Razorpay Checkout script."));
      document.head.appendChild(script);
    });
  }

  // ---------------------------------------------------------------
  // Collect all registration form data into a plain object.
  // ---------------------------------------------------------------
  function collectFormData(form, user) {
    const v = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim() || "";
    const teamSize = Number(form.querySelector('[name="teamSize"]:checked')?.value || 2);

    return {
      user_id: user.id,
      leader_email: user.email || v("m1_email"),
      team_name: v("teamName"),
      team_size: teamSize,
      college_name: v("collegeName"),
      member1_name: v("m1_name"),
      member1_roll: v("m1_roll"),
      member1_email: v("m1_email").toLowerCase(),
      member1_phone: v("m1_phone"),
      member1_year: v("m1_year"),
      member1_branch: v("m1_branch"),
      member1_section: v("m1_section"),
      member2_name: v("m2_name"),
      member2_roll: v("m2_roll"),
      member2_email: v("m2_email").toLowerCase(),
      member2_phone: v("m2_phone"),
      member2_year: v("m2_year"),
      member2_branch: v("m2_branch"),
      member2_section: v("m2_section"),
      member3_name: teamSize === 3 ? v("m3_name") : null,
      member3_roll: teamSize === 3 ? v("m3_roll") : null,
      member3_email: teamSize === 3 ? v("m3_email").toLowerCase() : null,
      member3_phone: teamSize === 3 ? v("m3_phone") : null,
      member3_year: teamSize === 3 ? v("m3_year") : null,
      member3_branch: teamSize === 3 ? v("m3_branch") : null,
      member3_section: teamSize === 3 ? v("m3_section") : null
    };
  }

  // ---------------------------------------------------------------
  // Main entry point — called when the "PAY NOW" button is clicked.
  // ---------------------------------------------------------------
  async function openRazorpayCheckout() {
    if (_paying) return; // Prevent double-click.

    const form = document.getElementById("registrationForm");
    if (!form) {
      console.error("razorpay.js: #registrationForm not found.");
      return;
    }

    // Get authenticated session.
    const regApi = window.CODEX_SUPABASE_REGISTRATION;
    if (!regApi?.client) {
      showStatus("Authentication error. Please sign in again.", true);
      return;
    }

    const { data: sessionData, error: sessionError } = await regApi.client.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      showStatus("Your session has expired. Please sign in again.", true);
      window.location.href = "./auth.html";
      return;
    }

    const user = sessionData.session.user;

    // Server-side duplicate check will also run, but do a quick client-side check first
    // to give immediate feedback without waiting for API calls.
    const { data: existing } = await regApi.client
      .from("registrations")
      .select("registration_id, payment_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.payment_status === "paid") {
      showStatus("This account already has a completed registration. Redirecting to your pass...", false);
      setTimeout(() => { window.location.href = "./register.html?view=pass"; }, 1800);
      return;
    }

    _paying = true;
    setPayButtonState(true);
    showStatus("Creating payment order...", false);

    try {
      // ---------------------------------------------------------------
      // STEP 1: Request a Razorpay Order from the server.
      // ---------------------------------------------------------------
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          teamSize: form.querySelector('[name="teamSize"]:checked')?.value || "2"
        })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.orderId) {
        throw new Error(orderData.error || "Failed to create payment order.");
      }

      // ---------------------------------------------------------------
      // STEP 2: Load Razorpay Checkout script.
      // ---------------------------------------------------------------
      await loadCheckoutScript();

      clearStatus();

      // Collect form data to send with verify-payment.
      const registrationData = collectFormData(form, user);

      // ---------------------------------------------------------------
      // STEP 3: Open Razorpay Checkout.
      // ---------------------------------------------------------------
      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "CODEX 4.0",
        description: "Inter-College Coding Event — Team Registration",
        image: "", // Optional: add a logo URL
        prefill: {
          name: registrationData.member1_name || "",
          email: registrationData.leader_email || "",
          contact: registrationData.member1_phone || ""
        },
        theme: {
          color: "#39ff74"
        },
        modal: {
          ondismiss: function () {
            // User closed / cancelled the Checkout modal.
            _paying = false;
            setPayButtonState(false);
            showStatus("Payment cancelled. You can try again.", false);
          }
        },
        handler: async function (response) {
          // This fires when Checkout reports payment success.
          // DO NOT trust this alone — verify server-side first.
          showStatus("Verifying payment...", false);
          setPayButtonState(true);

          try {
            // ---------------------------------------------------------------
            // STEP 4: Verify payment signature server-side.
            // ---------------------------------------------------------------
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                registrationData
              })
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // ---------------------------------------------------------------
            // STEP 5: Payment verified. Build result data and show ticket.
            // ---------------------------------------------------------------
            const result = {
              ...registrationData,
              // Camelcase aliases for renderPassScreen compatibility.
              teamName: registrationData.team_name,
              collegeName: registrationData.college_name,
              teamSize: registrationData.team_size,
              m1_name: registrationData.member1_name,
              m1_roll: registrationData.member1_roll,
              m1_email: registrationData.member1_email,
              m1_branch: registrationData.member1_branch,
              m1_year: registrationData.member1_year,
              m1_section: registrationData.member1_section,
              m2_name: registrationData.member2_name,
              m2_roll: registrationData.member2_roll,
              m2_email: registrationData.member2_email,
              m2_branch: registrationData.member2_branch,
              m2_year: registrationData.member2_year,
              m2_section: registrationData.member2_section,
              m3_name: registrationData.member3_name,
              m3_roll: registrationData.member3_roll,
              m3_email: registrationData.member3_email,
              m3_branch: registrationData.member3_branch,
              m3_year: registrationData.member3_year,
              m3_section: registrationData.member3_section,
              registrationId: verifyData.registrationId,
              registration_id: verifyData.registrationId,
              razorpay_payment_id: response.razorpay_payment_id,
              payment_status: "paid",
              status: verifyData.status || "Pending"
            };

            // Cache for ?view=pass reload.
            sessionStorage.setItem("codex-existing-reg", JSON.stringify(result));
            sessionStorage.setItem("codex-auth-email", result.leader_email || "");

            if (typeof window.showSuccess === "function") {
              window.showSuccess(result);
            }
          } catch (err) {
            console.error("razorpay.js: Verification error:", err);
            _paying = false;
            setPayButtonState(false);
            showStatus(err.message || "Payment verification failed. Please contact support.", true);
          }
        }
      });

      checkout.open();
    } catch (err) {
      console.error("razorpay.js: Checkout error:", err);
      _paying = false;
      setPayButtonState(false);
      showStatus(err.message || "Payment could not be initiated. Please try again.", true);
    }
  }

  // ---------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------
  function setPayButtonState(busy) {
    const btn = document.getElementById("payNowBtn");
    if (!btn) return;
    btn.disabled = busy;
    btn.innerHTML = busy
      ? "Processing... ⏳"
      : "PAY ₹300 →";
  }

  function showStatus(msg, isError) {
    if (typeof window.showStatus === "function") {
      window.showStatus(msg, isError);
    }
  }

  function clearStatus() {
    if (typeof window.clearStatus === "function") {
      window.clearStatus();
    }
  }

  // ---------------------------------------------------------------
  // Wire up the Pay Now button once the DOM is ready.
  // ---------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    const payBtn = document.getElementById("payNowBtn");
    if (payBtn) {
      payBtn.addEventListener("click", openRazorpayCheckout);
    }
  });

  // Expose publicly so it can be called from other scripts if needed.
  window.CODEX_RAZORPAY = { openRazorpayCheckout };
})();
