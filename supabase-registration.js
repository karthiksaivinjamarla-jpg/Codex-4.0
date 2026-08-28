(() => {
  const config = window.CODEX_SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.publishableKey) return;

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const form = document.querySelector("#registrationForm, form");
  if (!form) return;

  // This migration layer is intentionally conservative: it only intercepts the
  // final submit when the page has a Supabase session and leaves validation/UI
  // owned by the existing registration code.
  form.addEventListener("submit", async (event) => {
    if (form.dataset.supabaseSubmitting === "true") return;

    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      return; // existing auth flow handles this case
    }

    // Let the existing submit handler remain in control until the exact field
    // mapping is confirmed against the current form implementation.
    // This guard is deliberately non-destructive during the migration.
  }, true);

  window.CODEX_SUPABASE_REGISTRATION = { client };
})();
