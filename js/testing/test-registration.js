/* CODEX 4.0 — TEST REGISTRATION HELPER
 * Test-data autofill only. Never bypasses authentication, validation, payment, or Supabase.
 * Loaded only when explicitly requested with ?test=1 on localhost or Vercel.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const allowedHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.vercel.app');

  if (!allowedHost || params.get('test') !== '1') return;

  const values = {
    teamName: 'CODEX TEST TEAM',
    collegeName: 'G. Pulla Reddy Engineering College',
    m1: { name: 'Test User One', roll: 'TEST001', email: 'testuser1@example.com', phone: '9000000001', year: '3rd Year', branch: 'Electronics & Communication Engineering (ECE)', section: 'A' },
    m2: { name: 'Test User Two', roll: 'TEST002', email: 'testuser2@example.com', phone: '9000000002', year: '3rd Year', branch: 'Computer Science & Engineering (CSE)', section: 'A' },
    m3: { name: 'Test User Three', roll: 'TEST003', email: 'testuser3@example.com', phone: '9000000003', year: '2nd Year', branch: 'Information Technology (IT)', section: 'A' }
  };

  function setField(name, value) {
    const field = document.querySelector(`[name="${name}"]`);
    if (!field) return false;
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(field, value);
    else field.value = value;
    field.dataset.testFilled = 'true';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function fillMember(prefix, member) {
    Object.entries(member).forEach(([key, value]) => setField(`${prefix}_${key}`, value));
  }

  function fill() {
    setField('teamName', values.teamName);
    setField('collegeName', values.collegeName);
    fillMember('m1', values.m1);
    fillMember('m2', values.m2);

    const size3 = document.querySelector('input[name="teamSize"][value="3"]');
    if (size3) {
      size3.checked = true;
      size3.dispatchEvent(new Event('change', { bubbles: true }));
      fillMember('m3', values.m3);
    }

    const status = document.querySelector('#testRegistrationStatus');
    if (status) status.textContent = 'Test data filled. Continue normally and complete Razorpay Test Mode payment.';
  }

  function clear() {
    document.querySelectorAll('[data-test-filled="true"]').forEach((field) => {
      setField(field.name, '');
      delete field.dataset.testFilled;
    });
    const status = document.querySelector('#testRegistrationStatus');
    if (status) status.textContent = 'Test-filled fields cleared.';
  }

  function init() {
    const form = document.querySelector('#registrationForm');
    if (!form || document.querySelector('#testRegistrationTools')) return;

    const box = document.createElement('div');
    box.id = 'testRegistrationTools';
    box.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:14px;margin:0 0 16px;background:var(--soft);';
    box.innerHTML = `
      <strong style="font-size:11px;letter-spacing:.5px">TEST MODE — DATA AUTOFILL ONLY</strong>
      <p style="margin:6px 0 10px;font-size:10px;color:var(--muted)">Sample data only. Google authentication, validation and Razorpay payment are still required.</p>
      <button type="button" id="fillTestRegistration" class="secondary-btn">Fill Test Data</button>
      <button type="button" id="clearTestRegistration" class="secondary-btn" style="margin-left:8px">Clear Test Data</button>
      <div id="testRegistrationStatus" aria-live="polite" style="margin-top:8px;font-size:10px;color:var(--muted)"></div>`;

    form.querySelector('.stepper')?.before(box);
    box.querySelector('#fillTestRegistration').addEventListener('click', fill);
    box.querySelector('#clearTestRegistration').addEventListener('click', clear);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
