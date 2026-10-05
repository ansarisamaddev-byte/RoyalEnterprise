import { supabase } from '../config/supabase.js';
import { unwrap } from '../utils/httpError.js';

export async function getAllSettings() {
  const rows = unwrap(await supabase.from('settings').select('key,value'));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getSetting(key, fallback = null) {
  const row = unwrap(await supabase.from('settings').select('value').eq('key', key).maybeSingle());
  return row ? row.value : fallback;
}

export async function getEnabledTabs() {
  return unwrap(
    await supabase.from('product_tabs').select('*').eq('is_enabled', true).order('sort_order')
  );
}

export async function getTemplate(key) {
  const row = unwrap(
    await supabase.from('admin_message_templates').select('body').eq('key', key).maybeSingle()
  );
  return row?.body ?? null;
}
