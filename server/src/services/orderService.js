import { randomBytes } from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { HttpError, unwrap } from '../utils/httpError.js';
import { normalizeMobile } from '../utils/phone.js';
import { getSetting } from './settingsService.js';

const MAX_QTY = 10;

// Never expose internal columns (access_token, customer_id) to the public.
function publicOrder(o, items) {
  return {
    order_code: o.order_code,
    created_at: o.created_at,
    order_status: o.order_status,
    payment_status: o.payment_status,
    customer_name: o.customer_name,
    mobile: o.mobile,
    whatsapp: o.whatsapp,
    email: o.email,
    address: o.address,
    area: o.area,
    city: o.city,
    pincode: o.pincode,
    note: o.note,
    subtotal: Number(o.subtotal),
    delivery_charge: Number(o.delivery_charge),
    total: Number(o.total),
    items: items.map((i) => ({
      product_id: i.product_id,
      name: i.product_name,
      thumbnail_url: i.thumbnail_url,
      unit_price: Number(i.unit_price),
      quantity: i.quantity,
      line_total: Number(i.line_total),
    })),
  };
}

export async function createOrder(input) {
  // Merge duplicate lines
  const wanted = new Map();
  for (const line of input.items) {
    wanted.set(line.productId, Math.min((wanted.get(line.productId) || 0) + line.quantity, MAX_QTY));
  }

  // Re-price from the database: never trust prices sent by the browser.
  const products = unwrap(
    await supabase
      .from('products')
      .select('id,name,price,stock,thumbnail_url,is_active')
      .in('id', [...wanted.keys()])
  );
  const byId = new Map(products.map((p) => [p.id, p]));

  const problems = [];
  const lines = [];
  for (const [id, qty] of wanted) {
    const p = byId.get(id);
    if (!p || !p.is_active) problems.push('One of the products in your cart is no longer available.');
    else if (p.stock < qty) {
      problems.push(p.stock > 0 ? `Only ${p.stock} of "${p.name}" left in stock.` : `"${p.name}" is out of stock.`);
    } else lines.push({ p, qty });
  }
  if (problems.length) throw new HttpError(409, problems.join(' '));

  const subtotal = lines.reduce((s, l) => s + Number(l.p.price) * l.qty, 0);
  const delivery = Number(await getSetting('delivery_charge', 0)) || 0;
  const total = subtotal + delivery;

  const customer = unwrap(
    await supabase
      .from('customers')
      .upsert(
        { name: input.fullName, mobile: input.mobile, whatsapp: input.whatsapp, email: input.email || null },
        { onConflict: 'mobile' }
      )
      .select('id')
      .single()
  );

  const accessToken = randomBytes(12).toString('hex');
  const order = unwrap(
    await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        customer_name: input.fullName,
        mobile: input.mobile,
        whatsapp: input.whatsapp,
        email: input.email || null,
        address: input.address,
        area: input.area,
        city: input.city,
        pincode: input.pincode,
        note: input.note || null,
        subtotal,
        delivery_charge: delivery,
        total,
        order_status: 'ORDER_PLACED',
        payment_status: 'PAYMENT_PENDING',
        access_token: accessToken,
      })
      .select('*')
      .single()
  );

  const itemRows = lines.map(({ p, qty }) => ({
    order_id: order.id,
    product_id: p.id,
    product_name: p.name,
    thumbnail_url: p.thumbnail_url,
    unit_price: p.price,
    quantity: qty,
    line_total: Number(p.price) * qty,
  }));
  const { data: items, error } = await supabase.from('order_items').insert(itemRows).select('*');
  if (error) {
    await supabase.from('orders').delete().eq('id', order.id); // don't leave an empty order behind
    throw error;
  }

  return { ...publicOrder(order, items), access_token: accessToken };
}

async function loadItems(orderId) {
  return unwrap(await supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at'));
}

// Used by the confirmation page: needs the secret token handed out at checkout.
export async function getOrderWithToken(code, token) {
  const order = unwrap(
    await supabase.from('orders').select('*').eq('order_code', code).eq('access_token', token).maybeSingle()
  );
  if (!order) throw new HttpError(404, 'Order not found');
  return publicOrder(order, await loadItems(order.id));
}

// Used by Track Order: Order ID + mobile number must both match.
export async function trackOrder(code, mobile) {
  const order = unwrap(await supabase.from('orders').select('*').eq('order_code', code).maybeSingle());
  const notFound = new HttpError(404, 'Order not found. Please check the Order ID and mobile number.');
  if (!order) throw notFound;
  if (order.mobile !== mobile && normalizeMobile(order.whatsapp) !== mobile) throw notFound;
  return publicOrder(order, await loadItems(order.id));
}
