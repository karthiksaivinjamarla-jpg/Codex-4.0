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

  let saved = DEFAULT;
  try { saved = localStorage.getItem(KEY) || DEFAULT; } catch (_) {}
  applyTheme(saved);

  document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });
})();
