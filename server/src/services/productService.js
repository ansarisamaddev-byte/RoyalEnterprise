import { supabase } from '../config/supabase.js';
import { HttpError, unwrap } from '../utils/httpError.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIST_SELECT =
  '*, category:categories(id,name,slug,section), sub_category:sub_categories(id,name,slug), product_specifications(spec_key,spec_value), product_reviews(rating,is_visible)';

const DETAIL_SELECT =
  '*, category:categories(id,name,slug,section), sub_category:sub_categories(id,name,slug), product_specifications(*), product_reviews(*), product_offers(*), product_warranties(*)';

const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const RAM_KEY = /^ram$/i;
const STORAGE_KEY = /^(storage|internal storage|rom)$/i;

function ratingOf(reviews = []) {
  const visible = reviews.filter((r) => r.is_visible !== false);
  const count = visible.length;
  const avg = count ? Math.round((visible.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return { rating_avg: avg, review_count: count, visible };
}

function specOf(p, keyRe) {
  const s = (p.product_specifications || []).find((x) => keyRe.test(x.spec_key.trim()));
  return s ? s.spec_value.trim() : null;
}

const norm = (v) => String(v).toLowerCase().replace(/\s+/g, '');
const num = (v) => parseInt(v, 10) || 0;
const uniq = (arr) => [...new Set(arr.filter(Boolean))];
const csv = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

export async function listProducts(q = {}) {
  const rows = unwrap(await supabase.from('products').select(LIST_SELECT).eq('is_active', true));

  let pool = rows.map((p) => {
    const { product_reviews, ...rest } = p;
    const { rating_avg, review_count } = ratingOf(product_reviews);
    return { ...rest, rating_avg, review_count, _ram: specOf(p, RAM_KEY), _storage: specOf(p, STORAGE_KEY) };
  });

  // Base scope (before facet filters, so filter options stay stable)
  if (q.section === 'mobiles' || q.section === 'electronics') {
    pool = pool.filter((p) => p.category?.section === q.section);
  }
  if (q.category) pool = pool.filter((p) => p.category?.slug === q.category);
  if (q.sub) pool = pool.filter((p) => p.sub_category?.slug === q.sub);
  if (q.featured === '1') pool = pool.filter((p) => p.is_featured);
  if (q.q) {
    const term = String(q.q).toLowerCase();
    pool = pool.filter((p) =>
      [p.name, p.brand, p.description, p.category?.name].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }

  const prices = pool.map((p) => Number(p.price));
  const facets = {
    brands: uniq(pool.map((p) => p.brand)).sort(),
    ram: uniq(pool.map((p) => p._ram)).sort((a, b) => num(a) - num(b)),
    storage: uniq(pool.map((p) => p._storage)).sort((a, b) => num(a) - num(b)),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
  };

  // Facet filters
  const brands = csv(q.brand).map(norm);
  const rams = csv(q.ram).map(norm);
  const storages = csv(q.storage).map(norm);
  let items = pool.filter((p) => {
    if (brands.length && !brands.includes(norm(p.brand || ''))) return false;
    if (rams.length && !(p._ram && rams.includes(norm(p._ram)))) return false;
    if (storages.length && !(p._storage && storages.includes(norm(p._storage)))) return false;
    if (q.min && Number(p.price) < Number(q.min)) return false;
    if (q.max && Number(p.price) > Number(q.max)) return false;
    if (q.inStock === '1' && p.stock <= 0) return false;
    return true;
  });

  const sorters = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    featured: (a, b) =>
      Number(b.is_featured) - Number(a.is_featured) || new Date(b.created_at) - new Date(a.created_at),
  };
  items.sort(sorters[q.sort] || sorters.featured);

  const total = items.length;
  const limit = Math.min(Number(q.limit) || 0, 100);
  if (limit) items = items.slice(0, limit);

  const products = items.map(({ product_specifications, _ram, _storage, ...p }) => p);
  return { products, total, facets };
}

export async function getProduct(idOrSlug) {
  const col = UUID_RE.test(idOrSlug) ? 'id' : 'slug';
  const row = unwrap(
    await supabase.from('products').select(DETAIL_SELECT).eq(col, idOrSlug).eq('is_active', true).maybeSingle()
  );
  if (!row) throw new HttpError(404, 'Product unavailable');

  const { product_reviews, product_specifications, product_offers, product_warranties, ...rest } = row;
  const { rating_avg, review_count, visible } = ratingOf(product_reviews);
  return {
    ...rest,
    rating_avg,
    review_count,
    specifications: [...product_specifications].sort(bySort),
    reviews: visible.sort((a, b) => new Date(b.review_date) - new Date(a.review_date)),
    offers: [...product_offers].sort(bySort),
    warranties: [...product_warranties],
  };
}
