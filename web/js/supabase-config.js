const SUPABASE_URL = 'https://lzulkhmjjmofcizazdxk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_On2i52EToTlED7YhBp5HCg_VYfvFJiG';

// Ensure the supabase client object is available globally (from the CDN script in HTML)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
