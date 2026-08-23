(function () {
  const KEY = 'codex-theme';
  const DEFAULT = 'dark';

  function applyTheme(theme) {
    const value = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('light', value === 'light');
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem(KEY, value); } catch (_) {}

    document.querySelectorAll('[data-theme]').forEach((button) => {
      button.classList.toggle('active', button.dataset.theme === value);
      button.setAttribute('aria-pressed', button.dataset.theme === value ? 'true' : 'false');
    });

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', value === 'light' ? '#F2F2F2' : '#0D0D0D');
  }

  function addFaq() {
    if (document.getElementById('codex-faq') || !document.querySelector('main')) return;
    const anchor = document.querySelector('#contact');
    if (!anchor) return;

    const section = document.createElement('section');
    section.id = 'codex-faq';
    section.className = 'section codex-faq-section';
    section.innerHTML = `
      <div class="section-title">
        <span class="kicker">QUICK ANSWERS</span>
        <h2>Frequently Asked Questions</h2>
        <p>Common questions about CODEX 4.0. Official rules and updates will be published by the organizers.</p>
      </div>
      <div class="codex-faq-list">
        <details><summary>What is the maximum team size?</summary><p>Teams can have 2–3 members.</p></details>
        <details><summary>Can a team have a final-year candidate?</summary><p>Yes. A team can have at most one final-year candidate.</p></details>
        <details><summary>What is the registration fee?</summary><p>The registration fee is ₹300 per team.</p></details>
        <details><summary>When are the two rounds?</summary><p>Round 1 — Vibe 2 Vibe is scheduled for 20 August 2026. Round 2 — CodeSprint is scheduled for 2 September 2026.</p></details>
        <details><summary>Where will the event be held?</summary><p>The venue will be announced once finalized.</p></details>
        <details><summary>What is the prize pool?</summary><p>Prize details will be announced once finalized.</p></details>
      </div>`;
    anchor.parentNode.insertBefore(section, anchor.nextSibling);
  }

  let saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (_) {}
  applyTheme(saved);
  addFaq();

  document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });
})();
