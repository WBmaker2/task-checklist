// One-time app config (for developer/owner, not end users)
// End users should only need Google login in the Backup page.
window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || {
  url: "",
  anonKey: "",
  redirectTo: window.location.origin + window.location.pathname,
};
