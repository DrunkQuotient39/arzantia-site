/* The front door's settings. Both values are PUBLIC by design (Supabase's project URL and its
   publishable key); what protects the data is Row Level Security on every table. Never put a
   secret or service-role key here. */
window.ARCANE_CONFIG = {
  supabaseUrl: 'https://oowfggdpefbczkzpwmzg.supabase.co',
  supabaseKey: 'sb_publishable_OeleS-EkZxyUifsoSlnLrA_YTp8Irg6'
};
