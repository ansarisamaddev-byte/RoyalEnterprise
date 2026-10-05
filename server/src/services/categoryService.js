import { supabase } from '../config/supabase.js';
import { HttpError, unwrap } from '../utils/httpError.js';

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shape(c) {
  const { sub_categories = [], ...rest } = c;
  return { ...rest, sub_categories: sub_categories.filter((s) => s.is_active).sort(bySort) };
}

export async function listCategories() {
  const rows = unwrap(
    await supabase.from('categories').select('*, sub_categories(*)').eq('is_active', true)
  );
  return rows.sort(bySort).map(shape);
}

export async function getCategory(idOrSlug) {
  const col = UUID.test(idOrSlug) ? 'id' : 'slug';
  const row = unwrap(
    await supabase.from('categories').select('*, sub_categories(*)').eq(col, idOrSlug).eq('is_active', true).maybeSingle()
  );
  if (!row) throw new HttpError(404, 'Category not found');
  return shape(row);
}
