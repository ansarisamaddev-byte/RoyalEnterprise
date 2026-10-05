import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Service-role client. Bypasses RLS, so it must never be exposed to the browser.
export const supabase = createClient(env.supabaseUrl, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
