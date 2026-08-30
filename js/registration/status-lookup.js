(() => {
  const form = document.getElementById("lookupForm");
  const button = document.getElementById("lookupBtn");
  const message = document.getElementById("message");
  const result = document.getElementById("result");

  if (!form || !button || !message || !result) return;

  const esc = value => String(value ?? "").replace(/[&<>\'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  }[char]));

  const formatDate = value => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const registrationId = document.getElementById("registrationId")?.value.trim();
    const leaderEmail = document.getElementById("leaderEmail")?.value.trim().toLowerCase();

    result.classList.remove("show");
    result.innerHTML = "";
    message.className = "lookup-message";

    if (!registrationId || !leaderEmail) {
      message.textContent = "Please enter both your Registration ID and leader email.";
      message.classList.add("error");
      return;
    }

    button.disabled = true;
    button.textContent = "CHECKING...";
    message.textContent = "Checking your registration...";

    try {
      const response = await fetch("api/registration/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, leaderEmail })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Unable to find the registration.");

      const r = data.registration;
      const payment = String(r.paymentStatus || "pending").toLowerCase();
      const status = String(r.status || "Pending").toLowerCase();

      result.innerHTML = `
        <div class="result-head">
          <div><span class="kicker">REGISTRATION FOUND ✓</span><h3>${esc(r.teamName || "Team")}</h3><p>${esc(r.registrationId)}</p></div>
          <span class="badge ${payment}">${esc(payment === "paid" ? "PAID ✓" : payment)}</span>
        </div>
        <div class="result-grid">
          <div class="result-item"><span>COLLEGE</span><strong>${esc(r.collegeName || "-")}</strong></div>
          <div class="result-item"><span>TEAM SIZE</span><strong>${esc(r.teamSize || "-")} MEMBERS</strong></div>
          <div class="result-item"><span>REGISTRATION STATUS</span><strong>${esc(r.status || "Pending")}</strong></div>
          <div class="result-item"><span>PAYMENT STATUS</span><strong>${esc(payment.toUpperCase())}</strong></div>
          <div class="result-item"><span>PAYMENT ID</span><strong>${esc(r.paymentId || "-")}</strong></div>
          <div class="result-item"><span>REGISTERED ON</span><strong>${esc(formatDate(r.createdAt))}</strong></div>
        </div>
        <a class="pass-btn" href="register.html">BACK TO REGISTRATION →</a>
      `;
      result.classList.add("show");
      message.textContent = "Registration details found.";
      message.classList.add("success");
    } catch (error) {
      message.textContent = error.message || "Unable to check registration.";
      message.classList.add("error");
    } finally {
      button.disabled = false;
      button.textContent = "CHECK STATUS →";
    }
  });
})();
