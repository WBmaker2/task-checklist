// One-time app config (for developer/owner, not end users)
// End users should only need Google login in the Backup page.
window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || {
  url: "https://xznossvgtbdocftnjqsj.supabase.co",
  anonKey: "sb_publishable_P1wZiKT1OAxR2IBk3O2DTw_ut9iOm7q",
  redirectTo: window.location.origin + window.location.pathname,
};
