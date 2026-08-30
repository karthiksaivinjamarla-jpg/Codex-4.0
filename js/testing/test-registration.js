/* CODEX 4.0 — TEST REGISTRATION HELPER
 * Test-data autofill only. Never bypasses authentication, validation, payment, or Supabase.
 */
(function () {
  'use strict';

  const isTestHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.vercel.app');

  if (!isTestHost) return;

  const values = {
    teamName: 'CODEX TEST TEAM',
    member1Name: 'Test User One',
    member1Phone: '9000000001',
    member1Email: 'testuser1@example.com',
    member2Name: 'Test User Two',
    member2Phone: '9000000002',
    member2Email: 'testuser2@example.com',
    member3Name: 'Test User Three',
    member3Phone: '9000000003',
    member3Email: 'testuser3@example.com'
  };

  function findField(candidates) {
    return candidates.map((selector) => document.querySelector(selector)).find(Boolean);
  }

  function setField(field, value) {
    if (!field) return false;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    if (setter && field instanceof HTMLInputElement) setter.call(field, value);
    else field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function fill() {
    const fields = [
      [['#teamName', '[name="teamName"]'], values.teamName],
      [['#member1Name', '[name="member1Name"]'], values.member1Name],
      [['#member1Phone', '[name="member1Phone"]'], values.member1Phone],
      [['#member1Email', '[name="member1Email"]'], values.member1Email],
      [['#member2Name', '[name="member2Name"]'], values.member2Name],
      [['#member2Phone', '[name="member2Phone"]'], values.member2Phone],
      [['#member2Email', '[name="member2Email"]'], values.member2Email],
      [['#member3Name', '[name="member3Name"]'], values.member3Name],
      [['#member3Phone', '[name="member3Phone"]'], values.member3Phone],
      [['#member3Email', '[name="member3Email"]'], values.member3Email]
    ];

    fields.forEach(([selectors, value]) => setField(findField(selectors), value));

    const authEmail = document.querySelector('#leadEmail, [name="leadEmail"], [name="email"]');
    if (authEmail && authEmail.dataset.authLocked === 'true') {
      // Preserve the authenticated email when the application has locked it.
      return;
    }

    const status = document.querySelector('#testRegistrationStatus');
    if (status) status.textContent = 'Test data filled. Normal validation and payment are still required.';
  }

  function clear() {
    const selectors = [
      '#teamName, [name="teamName"]',
      '#member1Name, [name="member1Name"]', '#member1Phone, [name="member1Phone"]', '#member1Email, [name="member1Email"]',
      '#member2Name, [name="member2Name"]', '#member2Phone, [name="member2Phone"]', '#member2Email, [name="member2Email"]',
      '#member3Name, [name="member3Name"]', '#member3Phone, [name="member3Phone"]', '#member3Email, [name="member3Email"]'
    ];
    selectors.forEach((selector) => {
      const field = document.querySelector(selector);
      if (field && field.dataset.testFilled === 'true') setField(field, '');
    });
  }

  function init() {
    const form = document.querySelector('form');
    if (!form || document.querySelector('#testRegistrationTools')) return;

    const box = document.createElement('div');
    box.id = 'testRegistrationTools';
    box.innerHTML = `
      <div style="border:1px solid #d6d6d6;border-radius:12px;padding:14px;margin:16px 0;background:#fafafa">
        <strong>TEST MODE — DATA AUTOFILL ONLY</strong>
        <p style="margin:6px 0 10px;font-size:13px">This helper only fills sample data. Normal authentication, validation and Razorpay payment are still required.</p>
        <button type="button" id="fillTestRegistration">Fill Test Data</button>
        <button type="button" id="clearTestRegistration" style="margin-left:8px">Clear Test Data</button>
        <div id="testRegistrationStatus" aria-live="polite" style="margin-top:8px;font-size:13px"></div>
      </div>`;
    form.prepend(box);

    box.querySelector('#fillTestRegistration').addEventListener('click', fill);
    box.querySelector('#clearTestRegistration').addEventListener('click', clear);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
