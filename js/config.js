/* The website's settings. The Supabase URL and publishable key are PUBLIC by design (the same project the
   login page uses); Row Level Security protects the data. Never put a secret or service-role key here.
   - loginUrl: the login page (your campaigns, invites, Enter the table). It answers at /tables on this same
     address (tools/build_pages.py), so one sign-in serves both. Linked by address, never embedded. */
window.ARCANE_SITE = {
  supabaseUrl: 'https://oowfggdpefbczkzpwmzg.supabase.co',
  supabaseKey: 'sb_publishable_OeleS-EkZxyUifsoSlnLrA_YTp8Irg6',
  loginUrl: '/tables/'
};
