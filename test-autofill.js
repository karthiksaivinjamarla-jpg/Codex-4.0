(function () {
  if (location.protocol !== 'http:' || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  if (!document.body.classList.contains('register-page')) return;
  if (new URLSearchParams(location.search).get('test') !== '1') return;

  const values = {
    teamName: 'CODEX_TEST_TEAM_01',
    collegeName: 'CODEX Test College',
    m1_name: 'Test Leader',
    m1_roll: 'TEST001',
    m1_email: 'test-leader@example.com',
    m1_phone: '9000000001',
    m1_year: '3rd Year',
    m1_branch: 'Computer Science & Engineering (CSE)',
    m1_section: 'A',
    m2_name: 'Test Member',
    m2_roll: 'TEST002',
    m2_email: 'test-member@example.com',
    m2_phone: '9000000002',
    m2_year: '3rd Year',
    m2_branch: 'Information Technology (IT)',
    m2_section: 'B',
    utr: 'TESTUTR000001'
  };

  function setValue(name, value) {
    const field = document.querySelector(`[name="${name}"]`);
    if (!field) return;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function createTestReceipt() {
    const input = document.getElementById('receipt');
    if (!input || typeof DataTransfer === 'undefined') return;
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const bytes = Uint8Array.from(atob(pngBase64), char => char.charCodeAt(0));
    const file = new File([bytes], 'codex-test-receipt.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fill() {
    const teamSize = document.querySelector('input[name="teamSize"][value="2"]');
    if (teamSize) {
      teamSize.checked = true;
      teamSize.dispatchEvent(new Event('change', { bubbles: true }));
    }
    Object.entries(values).forEach(([name, value]) => setValue(name, value));
    createTestReceipt();
    document.querySelectorAll('#registrationForm .form-step').forEach(panel => panel.classList.remove('hidden'));
    const button = document.getElementById('testFillButton');
    if (button) {
      button.textContent = '✓ TEST DATA FILLED';
      setTimeout(() => { button.textContent = '⚡ FILL TEST DATA'; }, 1800);
    }
  }

  function addButton() {
    if (document.getElementById('testFillButton')) return;
    const button = document.createElement('button');
    button.id = 'testFillButton';
    button.type = 'button';
    button.textContent = '⚡ FILL TEST DATA';
    button.title = 'Local testing helper — fills a 2-member test registration';
    button.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid #39ff74;background:#07130c;color:#39ff74;border-radius:9px;padding:11px 14px;font:700 10px "Fira Code",monospace;cursor:pointer;box-shadow:0 8px 25px rgba(0,0,0,.35);';
    button.addEventListener('click', fill);
    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton);
  else addButton();
})();
