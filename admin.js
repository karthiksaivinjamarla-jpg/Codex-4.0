(() => {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.publishableKey) {
    console.error('Admin: Supabase configuration is missing.');
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let registrations = [];
  let currentUser = null;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

  function show(id) { $(id)?.classList.remove('hidden'); }
  function hide(id) { $(id)?.classList.add('hidden'); }

  function message(text, type = 'error') {
    const el = $('message');
    if (!el) return;
    el.textContent = text;
    el.className = `admin-message ${type}`;
  }

  function clearMessage() {
    $('message')?.classList.add('hidden');
  }

  function statusClass(status) {
    return String(status || 'Pending').toLowerCase();
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function getMemberCount(reg) {
    return Number(reg.team_size) === 3 ? 3 : 2;
  }

  function renderStats() {
    const total = registrations.length;
    const pending = registrations.filter(r => r.status === 'Pending').length;
    const approved = registrations.filter(r => r.status === 'Approved').length;
    const rejected = registrations.filter(r => r.status === 'Rejected').length;
    $('totalCount').textContent = total;
    $('pendingCount').textContent = pending;
    $('approvedCount').textContent = approved;
    $('rejectedCount').textContent = rejected;
  }

  function filteredRegistrations() {
    const query = ($('searchInput')?.value || '').trim().toLowerCase();
    const status = $('statusFilter')?.value || 'all';
    const size = $('teamSizeFilter')?.value || 'all';

    return registrations.filter(reg => {
      if (status !== 'all' && reg.status !== status) return false;
      if (size !== 'all' && String(reg.team_size) !== size) return false;
      if (!query) return true;
      const haystack = [
        reg.registration_id, reg.team_name, reg.leader_email, reg.college_name,
        reg.transaction_id, reg.member1_name, reg.member1_roll,
        reg.member2_name, reg.member2_roll, reg.member3_name, reg.member3_roll
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  function renderRows() {
    const rows = $('registrationRows');
    if (!rows) return;
    const list = filteredRegistrations();
    rows.innerHTML = '';
    hide('emptyState');

    if (!list.length) {
      show('emptyState');
      return;
    }

    for (const reg of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${esc(reg.registration_id || '-')}</strong><small>${esc(formatDate(reg.created_at))}</small></td>
        <td><strong>${esc(reg.team_name || '-')}</strong><small>${esc(reg.college_name || '-')}</small></td>
        <td><strong>${esc(reg.member1_name || '-')}</strong><small>${esc(reg.leader_email || reg.member1_email || '-')}</small></td>
        <td><span class="member-count">${getMemberCount(reg)}</span></td>
        <td><strong>₹${esc(reg.payment_amount ?? 0)}</strong><small>${esc(reg.transaction_id || '-')}</small></td>
        <td><span class="status ${statusClass(reg.status)}">${esc(reg.status || 'Pending')}</span></td>
        <td><button class="view-btn" type="button" data-view="${esc(reg.id)}">VIEW</button></td>`;
      rows.appendChild(tr);
    }

    rows.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => openDetails(btn.dataset.view)));
  }

  async function isAdmin(user) {
    const { data, error } = await client
      .from('admin_users')
      .select('user_id,email,is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function loadRegistrations() {
    clearMessage();
    const { data, error } = await client
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    registrations = data || [];
    renderStats();
    renderRows();
  }

  async function updateStatus(id, nextStatus) {
    const allowed = ['Pending', 'Approved', 'Rejected'];
    if (!allowed.includes(nextStatus)) return;

    const button = document.querySelector(`[data-status-action="${CSS.escape(id)}"]`);
    if (button) button.disabled = true;

    const { error } = await client
      .from('registrations')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) {
      message(`Status update failed: ${error.message}`);
      if (button) button.disabled = false;
      return;
    }

    const item = registrations.find(r => r.id === id);
    if (item) item.status = nextStatus;
    renderStats();
    renderRows();
    openDetails(id);
  }

  async function getReceiptUrl(path) {
    if (!path) return null;
    const { data, error } = await client.storage
      .from('registration-receipts')
      .createSignedUrl(path, 600);
    if (error) {
      console.warn('Receipt URL error:', error.message);
      return null;
    }
    return data?.signedUrl || null;
  }

  async function openDetails(id) {
    const reg = registrations.find(r => r.id === id);
    if (!reg) return;

    const content = $('detailContent');
    const modal = $('detailModal');
    if (!content || !modal) return;

    const count = getMemberCount(reg);
    const members = Array.from({ length: count }, (_, index) => {
      const n = index + 1;
      return `<div class="member-detail"><span>MEMBER ${n}${n === 1 ? ' · LEADER' : ''}</span><strong>${esc(reg[`member${n}_name`] || '-')}</strong><small>${esc(reg[`member${n}_roll`] || '-')} · ${esc(reg[`member${n}_branch`] || '-')} · ${esc(reg[`member${n}_year`] || '-')} · Sec ${esc(reg[`member${n}_section`] || '-')}</small><small>${esc(reg[`member${n}_email`] || '-')} · ${esc(reg[`member${n}_phone`] || '-')}</small></div>`;
    }).join('');

    content.innerHTML = `
      <div class="detail-head"><div><span class="kicker">REGISTRATION DETAILS</span><h2>${esc(reg.team_name || '-')}</h2><p>${esc(reg.registration_id || '-')} · ${esc(formatDate(reg.created_at))}</p></div><span class="status ${statusClass(reg.status)}">${esc(reg.status || 'Pending')}</span></div>
      <div class="detail-grid"><div><label>COLLEGE</label><strong>${esc(reg.college_name || '-')}</strong></div><div><label>LEADER EMAIL</label><strong>${esc(reg.leader_email || '-')}</strong></div><div><label>PAYMENT</label><strong>₹${esc(reg.payment_amount ?? 0)}</strong></div><div><label>UTR / TRANSACTION ID</label><strong>${esc(reg.transaction_id || '-')}</strong></div></div>
      <h3 class="detail-section-title">TEAM MEMBERS</h3><div class="member-list">${members}</div>
      <div class="receipt-box"><div><label>PAYMENT RECEIPT</label><span id="receiptState">Preparing secure preview...</span></div><a id="receiptLink" class="view-btn hidden" target="_blank" rel="noopener">OPEN RECEIPT ↗</a></div>
      <div class="detail-actions"><button type="button" class="action pending" data-status-action="${esc(reg.id)}">MARK PENDING</button><button type="button" class="action approve" data-status-action="${esc(reg.id)}">APPROVE</button><button type="button" class="action reject" data-status-action="${esc(reg.id)}">REJECT</button></div>`;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    content.querySelector('.pending').addEventListener('click', () => updateStatus(reg.id, 'Pending'));
    content.querySelector('.approve').addEventListener('click', () => updateStatus(reg.id, 'Approved'));
    content.querySelector('.reject').addEventListener('click', () => updateStatus(reg.id, 'Rejected'));

    const receiptUrl = await getReceiptUrl(reg.receipt_url);
    const state = $('receiptState');
    const link = $('receiptLink');
    if (receiptUrl && link) {
      link.href = receiptUrl;
      link.classList.remove('hidden');
      if (state) state.textContent = 'Secure signed link ready.';
    } else if (state) {
      state.textContent = reg.receipt_url ? 'Receipt exists but could not be opened.' : 'No receipt path stored.';
    }
  }

  function closeModal() {
    const modal = $('detailModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function signOut() {
    await client.auth.signOut();
    window.location.href = 'auth.html';
  }

  async function boot() {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session?.user) {
        window.location.href = 'auth.html?return=./admin.html';
        return;
      }

      currentUser = data.session.user;
      $('adminEmail').textContent = currentUser.email || 'Authenticated';

      let admin;
      try {
        admin = await isAdmin(currentUser);
      } catch (error) {
        console.error('Admin lookup failed:', error);
        hide('loadingState');
        show('accessDenied');
        $('accessDeniedText').textContent = `Admin access could not be verified. Run the admin SQL setup first. (${error.message})`;
        return;
      }

      if (!admin) {
        hide('loadingState');
        show('accessDenied');
        return;
      }

      hide('loadingState');
      show('dashboard');
      await loadRegistrations();
    } catch (error) {
      console.error('Admin boot error:', error);
      hide('loadingState');
      show('accessDenied');
      $('accessDeniedText').textContent = error.message || 'Unable to verify admin access.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('refreshBtn')?.addEventListener('click', async () => {
      const btn = $('refreshBtn');
      btn.disabled = true;
      try { await loadRegistrations(); } catch (error) { message(error.message || 'Unable to refresh registrations.'); }
      finally { btn.disabled = false; }
    });
    $('signOutBtn')?.addEventListener('click', signOut);
    $('searchInput')?.addEventListener('input', renderRows);
    $('statusFilter')?.addEventListener('change', renderRows);
    $('teamSizeFilter')?.addEventListener('change', renderRows);
    document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
    boot();
  });
})();