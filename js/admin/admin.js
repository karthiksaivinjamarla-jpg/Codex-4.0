(() => {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.publishableKey) {
    console.error("Admin: Supabase configuration is missing.");
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  let registrations = [];
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>\'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[c]));

  const show = id => $(id)?.classList.remove("hidden");
  const hide = id => $(id)?.classList.add("hidden");

  function message(text, type = "error") {
    const e = $("message");
    if (e) {
      e.textContent = text;
      e.className = `admin-message ${type}`;
    }
  }

  function formatDate(v) {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? String(v)
      : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function statusClass(s) {
    return String(s || "Pending").toLowerCase();
  }

  function memberCount(r) {
    return Number(r.team_size) === 3 ? 3 : 2;
  }

  function renderStats() {
    $("totalCount").textContent = registrations.length;
    $("pendingCount").textContent = registrations.filter(r => r.status === "Pending").length;
    $("approvedCount").textContent = registrations.filter(r => r.status === "Approved").length;
    $("rejectedCount").textContent = registrations.filter(r => r.status === "Rejected").length;
    const paidEl = $("paidCount");
    if (paidEl) paidEl.textContent = registrations.filter(r => r.payment_status === "paid").length;
  }

  function filtered() {
    const q = ($("searchInput")?.value || "").trim().toLowerCase();
    const s = $("statusFilter")?.value || "all";
    const z = $("teamSizeFilter")?.value || "all";

    return registrations.filter(r => {
      if (s !== "all" && r.status !== s) return false;
      if (z !== "all" && String(r.team_size) !== z) return false;
      if (!q) return true;

      return [
        r.registration_id,
        r.team_name,
        r.leader_email,
        r.college_name,
        r.transaction_id,
        r.razorpay_payment_id,
        r.razorpay_order_id,
        r.payment_status,
        r.member1_name,
        r.member1_roll,
        r.member2_name,
        r.member2_roll,
        r.member3_name,
        r.member3_roll
      ].join(" ").toLowerCase().includes(q);
    });
  }

  function renderRows() {
    const rows = $("registrationRows");
    if (!rows) return;

    const list = filtered();
    rows.innerHTML = "";
    hide("emptyState");

    if (!list.length) {
      show("emptyState");
      return;
    }

    for (const r of list) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${esc(r.registration_id || "-")}</strong>
          <small>${esc(formatDate(r.created_at))}</small>
        </td>
        <td>
          <strong>${esc(r.team_name || "-")}</strong>
          <small>${esc(r.college_name || "-")}</small>
        </td>
        <td>
          <strong>${esc(r.member1_name || "-")}</strong>
          <small>${esc(r.leader_email || r.member1_email || "-")}</small>
        </td>
        <td><span class="member-count">${memberCount(r)}</span></td>
        <td>
          <strong>₹${esc(r.payment_amount ?? 0)}</strong>
          <small class="payment-id-cell">${esc(r.razorpay_payment_id || r.transaction_id || "-")}</small>
          <span class="payment-status-badge ${esc(r.payment_status || "pending")}">${esc(r.payment_status || "pending")}</span>
        </td>
        <td>
          <span class="status ${statusClass(r.status)}">${esc(r.status || "Pending")}</span>
        </td>
        <td><button class="view-btn" type="button" data-view="${esc(r.id)}">VIEW</button></td>
      `;
      rows.appendChild(tr);
    }

    rows.querySelectorAll("[data-view]").forEach(button => {
      button.addEventListener("click", () => openDetails(button.dataset.view));
    });
  }

  // admin_users contains user_id and email. No is_active column is required.
  async function isAdmin(user) {
    const { data, error } = await client
      .from("admin_users")
      .select("user_id,email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function loadRegistrations() {
    const { data, error } = await client
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    registrations = data || [];
    renderStats();
    renderRows();
  }

  async function updateStatus(id, next) {
    if (!["Pending", "Approved", "Rejected"].includes(next)) return;

    const { error } = await client
      .from("registrations")
      .update({ status: next })
      .eq("id", id);

    if (error) {
      message(`Status update failed: ${error.message}`);
      return;
    }

    const r = registrations.find(x => x.id === id);
    if (r) r.status = next;

    renderStats();
    renderRows();
    openDetails(id);
  }

  async function receiptUrl(path) {
    if (!path) return null;

    const { data, error } = await client
      .storage
      .from("registration-receipts")
      .createSignedUrl(path, 600);

    if (error) return null;
    return data?.signedUrl || null;
  }

  async function openDetails(id) {
    const r = registrations.find(x => x.id === id);
    if (!r) return;

    const c = $("detailContent");
    const m = $("detailModal");
    if (!c || !m) return;

    const members = Array.from({ length: memberCount(r) }, (_, i) => {
      const n = i + 1;
      return `
        <div class="member-detail">
          <span>MEMBER ${n}${n === 1 ? " · LEADER" : ""}</span>
          <strong>${esc(r[`member${n}_name`] || "-")}</strong>
          <small>${esc(r[`member${n}_roll`] || "-")} · ${esc(r[`member${n}_branch`] || "-")} · ${esc(r[`member${n}_year`] || "-")} · Sec ${esc(r[`member${n}_section`] || "-")}</small>
          <small>${esc(r[`member${n}_email`] || "-")} · ${esc(r[`member${n}_phone`] || "-")}</small>
        </div>
      `;
    }).join("");

    c.innerHTML = `
      <div class="detail-head">
        <div>
          <span class="kicker">REGISTRATION DETAILS</span>
          <h2>${esc(r.team_name || "-")}</h2>
          <p>${esc(r.registration_id || "-")} · ${esc(formatDate(r.created_at))}</p>
        </div>
        <span class="status ${statusClass(r.status)}">${esc(r.status || "Pending")}</span>
      </div>

      <div class="detail-grid">
        <div><label>COLLEGE</label><strong>${esc(r.college_name || "-")}</strong></div>
        <div><label>LEADER EMAIL</label><strong>${esc(r.leader_email || "-")}</strong></div>
        <div><label>PAYMENT AMOUNT</label><strong>₹${esc(r.payment_amount ?? 0)}</strong></div>
        <div><label>PAYMENT STATUS</label><strong class="payment-status-badge ${esc(r.payment_status || "pending")}">${esc(r.payment_status || "pending").toUpperCase()}</strong></div>
        <div><label>RAZORPAY ORDER ID</label><strong class="mono-text">${esc(r.razorpay_order_id || "-")}</strong></div>
        <div><label>RAZORPAY PAYMENT ID</label><strong class="mono-text">${esc(r.razorpay_payment_id || "-")}</strong></div>
        <div><label>PAYMENT VERIFIED AT</label><strong>${esc(formatDate(r.payment_verified_at) || "-")}</strong></div>
        ${r.transaction_id ? `<div><label>LEGACY UTR</label><strong>${esc(r.transaction_id)}</strong></div>` : ""}
      </div>

      <h3 class="detail-section-title">TEAM MEMBERS</h3>
      <div class="member-list">${members}</div>

      ${r.receipt_url ? `
      <div class="receipt-box">
        <div>
          <label>PAYMENT RECEIPT (LEGACY)</label>
          <span id="receiptState">Preparing secure link...</span>
        </div>
        <a id="receiptLink" class="view-btn hidden" target="_blank" rel="noopener">OPEN RECEIPT ↗</a>
      </div>` : ""}

      <div class="detail-actions">
        <button class="action pending" type="button" data-status-action="pending">MARK PENDING</button>
        <button class="action approve" type="button" data-status-action="approve">APPROVE</button>
        <button class="action reject" type="button" data-status-action="reject">REJECT</button>
      </div>
    `;

    m.classList.remove("hidden");
    m.setAttribute("aria-hidden", "false");

    c.querySelector(".pending").onclick = () => updateStatus(r.id, "Pending");
    c.querySelector(".approve").onclick = () => updateStatus(r.id, "Approved");
    c.querySelector(".reject").onclick = () => updateStatus(r.id, "Rejected");

    // Only fetch signed receipt URL for legacy registrations that have one.
    if (r.receipt_url) {
      const url = await receiptUrl(r.receipt_url);
      const receiptLink = $("receiptLink");
      const receiptState = $("receiptState");
      if (url && receiptLink) {
        receiptLink.href = url;
        receiptLink.classList.remove("hidden");
        if (receiptState) receiptState.textContent = "Secure signed link ready.";
      } else if (receiptState) {
        receiptState.textContent = "Receipt exists but could not be opened.";
      }
    }
  }

  function closeModal() {
    const m = $("detailModal");
    if (m) {
      m.classList.add("hidden");
      m.setAttribute("aria-hidden", "true");
    }
  }

  function showLoginState() {
    hide("loadingState");
    show("accessDenied");
    $("accessTitle").textContent = "Admin sign-in required";
    $("accessDeniedText").textContent = "Sign in with the Google account that has been added to the CODEX 4.0 admin_users table.";
    $("adminLoginBtn")?.classList.remove("hidden");
    $("backToLoginBtn")?.classList.add("hidden");
  }

  function showDeniedState(text) {
    hide("loadingState");
    show("accessDenied");
    $("accessTitle").textContent = "Admin access required";
    $("accessDeniedText").textContent = text || "This account is not authorized to access the CODEX 4.0 administration dashboard.";
    $("adminLoginBtn")?.classList.add("hidden");
    $("backToLoginBtn")?.classList.remove("hidden");
  }

  async function startAdminGoogleLogin() {
    const button = $("adminLoginBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "OPENING GOOGLE...";
    }

    try {
      const redirectTo = new URL("admin.html", window.location.href).href;
      const { data, error } = await client.auth.signInWithOAuth({
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
      if (data?.url) window.location.href = data.url;
    } catch (error) {
      console.error("Admin Google sign-in error:", error);
      if (button) {
        button.disabled = false;
        button.textContent = "CONTINUE WITH GOOGLE";
      }
      showDeniedState(`Admin sign-in failed: ${error.message || "Please try again."}`);
    }
  }

  async function boot() {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;

      if (!data.session?.user) {
        showLoginState();
        return;
      }

      const u = data.session.user;
      $("adminEmail").textContent = u.email || "Authenticated";

      let ok = false;
      try {
        ok = await isAdmin(u);
      } catch (e) {
        showDeniedState(`Admin access could not be verified. Check the admin_users SELECT policy. (${e.message})`);
        return;
      }

      if (!ok) {
        showDeniedState(`The signed-in account ${u.email || ""} is not listed in admin_users.`);
        return;
      }

      hide("loadingState");
      hide("accessDenied");
      show("dashboard");

      await loadRegistrations();
    } catch (e) {
      console.error("Admin boot error:", e);
      showDeniedState(e.message || "Unable to verify admin access.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("adminLoginBtn")?.addEventListener("click", startAdminGoogleLogin);

    $("refreshBtn")?.addEventListener("click", async () => {
      const b = $("refreshBtn");
      b.disabled = true;
      try {
        await loadRegistrations();
      } catch (e) {
        message(e.message || "Unable to refresh registrations.");
      } finally {
        b.disabled = false;
      }
    });

    $("signOutBtn")?.addEventListener("click", async () => {
      await client.auth.signOut();
      location.href = "admin.html";
    });

    $("searchInput")?.addEventListener("input", renderRows);
    $("statusFilter")?.addEventListener("change", renderRows);
    $("teamSizeFilter")?.addEventListener("change", renderRows);

    document.querySelectorAll("[data-close-modal]").forEach(e => {
      e.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeModal();
    });

    boot();
  });
})();
