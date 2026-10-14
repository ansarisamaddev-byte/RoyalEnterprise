import { supabase } from '../../config/supabase.js';
import { HttpError, unwrap } from '../../utils/httpError.js';
import { sendOrderTemplate } from '../../services/whatsappService.js';

const PRODUCT_FIELDS = [
  'name', 'slug', 'category_id', 'subcategory_id', 'brand', 'description', 'price', 'original_price',
  'discount', 'stock', 'sku', 'thumbnail_url', 'image_urls', 'highlights', 'badge', 'is_featured', 'is_active',
];
const CATEGORY_FIELDS = ['name', 'slug', 'section', 'icon', 'sort_order', 'is_active'];
const ORDER_STATUSES = ['ORDER_PLACED', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CUSTOMER_CANCELLED', 'CANCELLED', 'OUT_OF_STOCK'];
const PAYMENT_STATUSES = ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'REFUNDED'];
const PRODUCT_ENTRY_FIELDS = {
  specifications: { table: 'product_specifications', fields: ['spec_key', 'spec_value', 'sort_order'], required: ['spec_key', 'spec_value'] },
  reviews: { table: 'product_reviews', fields: ['customer_name', 'rating', 'review', 'review_date', 'is_visible'], required: ['customer_name', 'rating'] },
  offers: { table: 'product_offers', fields: ['title', 'description', 'discount_text', 'image_url', 'sort_order'], required: ['title'] },
  warranties: { table: 'product_warranties', fields: ['title', 'duration', 'description'], required: ['title'] },
};

function pick(body, fields) {
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
}

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `${label} is required`);
  return value.trim();
}

function productData(body, creating) {
  const data = pick(body, PRODUCT_FIELDS);
  if (creating || Object.hasOwn(data, 'name')) data.name = requireText(data.name, 'Product name');
  if (creating || Object.hasOwn(data, 'slug')) data.slug = requireText(data.slug, 'Product slug').toLowerCase();
  if (creating && !Object.hasOwn(data, 'price')) throw new HttpError(400, 'Product price is required');
  if (Object.hasOwn(data, 'price') && (!Number.isFinite(Number(data.price)) || Number(data.price) < 0)) throw new HttpError(400, 'Price must be a non-negative number');
  if (Object.hasOwn(data, 'stock') && (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0)) throw new HttpError(400, 'Stock must be a non-negative whole number');
  for (const field of ['image_urls', 'highlights']) {
    if (Object.hasOwn(data, field) && !Array.isArray(data[field])) throw new HttpError(400, `${field} must be a list`);
  }
  if (!Object.keys(data).length) throw new HttpError(400, 'No product fields provided');
  return data;
}

function categoryData(body, creating) {
  const data = pick(body, CATEGORY_FIELDS);
  if (creating || Object.hasOwn(data, 'name')) data.name = requireText(data.name, 'Category name');
  if (creating || Object.hasOwn(data, 'slug')) data.slug = requireText(data.slug, 'Category slug').toLowerCase();
  if (Object.hasOwn(data, 'section') && !['mobiles', 'electronics'].includes(data.section)) throw new HttpError(400, 'Section must be mobiles or electronics');
  if (!Object.keys(data).length) throw new HttpError(400, 'No category fields provided');
  return data;
}

function trendBuckets(period) {
  const now = new Date();
  if (period === 'day') {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(start.getTime() + i * 2 * 60 * 60 * 1000);
      const to = new Date(from.getTime() + 2 * 60 * 60 * 1000);
      return { from, to, label: new Intl.DateTimeFormat('en-IN', { hour: 'numeric' }).format(from) };
    });
  }
  if (period === 'week') {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return Array.from({ length: 7 }, (_, i) => {
      const from = new Date(today.getTime() - (6 - i) * 86400000);
      return { from, to: new Date(from.getTime() + 86400000), label: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(from) };
    });
  }
  if (period === 'year') {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1));
      const to = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i + 1, 1));
      return { from, to, label: new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(from) };
    });
  }
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  return Array.from({ length: 6 }, (_, i) => {
    const from = new Date(first.getTime() + i * 5 * 86400000);
    return { from, to: new Date(from.getTime() + 5 * 86400000), label: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(from) };
  });
}

export async function getOverview(period = 'month') {
  const buckets = trendBuckets(['day', 'week', 'month', 'year'].includes(period) ? period : 'month');
  const [products, categories, orders, pending, trend] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('order_status', 'ORDER_PLACED'),
    Promise.all(buckets.map(async (bucket) => {
      const result = await supabase.from('orders').select('id', { count: 'exact', head: true })
        .gte('created_at', bucket.from.toISOString()).lt('created_at', bucket.to.toISOString());
      if (result.error) throw result.error;
      return { label: bucket.label, count: result.count || 0 };
    })),
  ]);
  for (const result of [products, categories, orders, pending]) if (result.error) throw result.error;
  const periodOrders = trend.reduce((sum, bucket) => sum + bucket.count, 0);
  return {
    active_products: products.count,
    active_categories: categories.count,
    orders: orders.count,
    new_orders: pending.count,
    period_orders: periodOrders,
    trend,
  };
}

export async function listProducts() {
  return unwrap(await supabase.from('products')
    .select('id,name,slug,brand,description,price,original_price,discount,stock,sku,thumbnail_url,image_urls,highlights,badge,is_active,is_featured,category_id,subcategory_id,category:categories(name)')
    .order('created_at', { ascending: false }).limit(200));
}

export async function saveProduct(id, body) {
  const data = productData(body, !id);
  const query = id ? supabase.from('products').update(data).eq('id', id) : supabase.from('products').insert(data);
  const row = unwrap(await query.select('*').single());
  return row;
}

export async function deleteProduct(id) {
  unwrap(await supabase.from('products').delete().eq('id', id));
}

export async function listCategories() {
  return unwrap(await supabase.from('categories').select('*, sub_categories(*)').order('sort_order').order('name'));
}

export async function saveCategory(id, body) {
  const data = categoryData(body, !id);
  const query = id ? supabase.from('categories').update(data).eq('id', id) : supabase.from('categories').insert(data);
  return unwrap(await query.select('*').single());
}

export async function deleteCategory(id) {
  unwrap(await supabase.from('categories').delete().eq('id', id));
}

export async function saveSubcategory(categoryId, id, body) {
  const data = pick(body, ['name', 'slug', 'sort_order', 'is_active']);
  if (!id || Object.hasOwn(data, 'name')) data.name = requireText(data.name, 'Subcategory name');
  if (!id || Object.hasOwn(data, 'slug')) data.slug = requireText(data.slug, 'Subcategory slug').toLowerCase();
  const query = id
    ? supabase.from('sub_categories').update(data).eq('id', id).eq('category_id', categoryId)
    : supabase.from('sub_categories').insert({ ...data, category_id: categoryId });
  return unwrap(await query.select('*').single());
}

export async function deleteSubcategory(categoryId, id) {
  unwrap(await supabase.from('sub_categories').delete().eq('id', id).eq('category_id', categoryId));
}

export async function listOrders() {
  return unwrap(await supabase.from('orders')
    .select('id,order_code,customer_name,mobile,whatsapp,email,address,area,city,pincode,note,subtotal,delivery_charge,total,order_status,payment_status,created_at,updated_at,order_items(id,product_name,thumbnail_url,unit_price,quantity,line_total)')
    .order('created_at', { ascending: false }).limit(100));
}

export async function updateOrder(id, body) {
  const data = pick(body, ['order_status', 'payment_status']);
  if (!Object.keys(data).length) throw new HttpError(400, 'Choose an order or payment status to update');
  if (data.order_status && !ORDER_STATUSES.includes(data.order_status)) throw new HttpError(400, 'Invalid order status');
  if (data.payment_status && !PAYMENT_STATUSES.includes(data.payment_status)) throw new HttpError(400, 'Invalid payment status');
  return unwrap(await supabase.from('orders').update(data).eq('id', id)
    .select('id,order_code,order_status,payment_status,updated_at').single());
}

export async function getSettings() {
  const rows = unwrap(await supabase.from('settings').select('key,value'));
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export async function saveSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new HttpError(400, 'Settings must be an object');
  const rows = Object.entries(settings).map(([key, value]) => {
    if (!key.trim() || value === undefined) throw new HttpError(400, 'Invalid setting');
    if (key === 'delivery_charge' && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new HttpError(400, 'Delivery charge must be a non-negative number');
    if (['delivery_cities', 'delivery_pincodes'].includes(key)) {
      if (!Array.isArray(value) || !value.length || value.some((item) => typeof item !== 'string' || !item.trim())) {
        throw new HttpError(400, `${key} must contain at least one valid value`);
      }
      const normalized = [...new Set(value.map((item) => item.trim()))];
      if (key === 'delivery_pincodes' && normalized.some((pincode) => !/^\d{6}$/.test(pincode))) {
        throw new HttpError(400, 'Delivery PIN codes must be 6 digits');
      }
      value = normalized;
    }
    return { key, value };
  });
  if (!rows.length) throw new HttpError(400, 'No settings provided');
  unwrap(await supabase.from('settings').upsert(rows, { onConflict: 'key' }));
  return getSettings();
}

export async function listTabs() {
  return unwrap(await supabase.from('product_tabs').select('*').order('sort_order'));
}

export async function saveTab(key, body) {
  const data = pick(body, ['label', 'content', 'is_enabled', 'is_custom', 'sort_order']);
  if (Object.hasOwn(data, 'label')) data.label = requireText(data.label, 'Tab label');
  if (!Object.keys(data).length) throw new HttpError(400, 'No tab fields provided');
  return unwrap(await supabase.from('product_tabs').update(data).eq('key', key).select('*').single());
}

export async function createTab(body) {
  const key = requireText(body.key, 'Tab key').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const label = requireText(body.label, 'Tab label');
  return unwrap(await supabase.from('product_tabs').insert({
    key, label, content: body.content ?? '', is_enabled: body.is_enabled !== false, is_custom: true,
    sort_order: Number.isInteger(body.sort_order) ? body.sort_order : 99,
  }).select('*').single());
}

export async function listProductEntries(productId, resource) {
  const config = PRODUCT_ENTRY_FIELDS[resource];
  if (!config) throw new HttpError(404, 'Product information section not found');
  return unwrap(await supabase.from(config.table).select('*').eq('product_id', productId));
}

export async function saveProductEntry(productId, resource, entryId, body) {
  const config = PRODUCT_ENTRY_FIELDS[resource];
  if (!config) throw new HttpError(404, 'Product information section not found');
  const data = pick(body, config.fields);
  for (const field of config.required) {
    if (!entryId || Object.hasOwn(data, field)) {
      if (field === 'rating') {
        if (!Number.isInteger(Number(data.rating)) || Number(data.rating) < 1 || Number(data.rating) > 5) throw new HttpError(400, 'Rating must be between 1 and 5');
        data.rating = Number(data.rating);
      } else data[field] = requireText(data[field], field.replaceAll('_', ' '));
    }
  }
  if (resource === 'reviews' && Object.hasOwn(data, 'rating') && (!Number.isInteger(Number(data.rating)) || Number(data.rating) < 1 || Number(data.rating) > 5)) throw new HttpError(400, 'Rating must be between 1 and 5');
  if (!Object.keys(data).length) throw new HttpError(400, 'No product information fields provided');
  const query = entryId
    ? supabase.from(config.table).update(data).eq('id', entryId).eq('product_id', productId)
    : supabase.from(config.table).insert({ ...data, product_id: productId });
  return unwrap(await query.select('*').single());
}

export async function deleteProductEntry(productId, resource, entryId) {
  const config = PRODUCT_ENTRY_FIELDS[resource];
  if (!config) throw new HttpError(404, 'Product information section not found');
  unwrap(await supabase.from(config.table).delete().eq('id', entryId).eq('product_id', productId));
}

export async function listTemplates() {
  return unwrap(await supabase.from('admin_message_templates').select('*').order('sort_order'));
}

export async function saveTemplate(key, body) {
  const data = pick(body, ['label', 'body', 'sort_order']);
  if (Object.hasOwn(data, 'label')) data.label = requireText(data.label, 'Template label');
  if (Object.hasOwn(data, 'body')) data.body = requireText(data.body, 'Template message');
  if (!Object.keys(data).length) throw new HttpError(400, 'No template fields provided');
  return unwrap(await supabase.from('admin_message_templates').update(data).eq('key', key).select('*').single());
}

export async function sendOrderMessage(id, key) {
  const order = unwrap(await supabase.from('orders')
    .select('id,order_code,customer_name,mobile,whatsapp,total,order_status,payment_status')
    .eq('id', id).maybeSingle());
  if (!order) throw new HttpError(404, 'Order not found');
  const rows = unwrap(await supabase.from('order_items')
    .select('product_name,quantity,line_total')
    .eq('order_id', id).order('created_at'));
  const items = rows.map((item) => ({ name: item.product_name, quantity: item.quantity, line_total: item.line_total }));
  return sendOrderTemplate({ ...order, items }, key);
}