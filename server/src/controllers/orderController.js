import { asyncHandler, HttpError } from '../utils/httpError.js';
import { normalizeMobile } from '../utils/phone.js';
import { createOrder, getOrderWithToken, trackOrder } from '../services/orderService.js';
import { sendOrderTemplate } from '../services/whatsappService.js';

const str = (v) => String(v ?? '').trim();

function validate(b) {
  const f = {};
  const fullName = str(b.fullName);
  const mobile = normalizeMobile(b.mobile);
  const whatsapp = b.whatsapp ? normalizeMobile(b.whatsapp) : mobile;
  const email = str(b.email);
  const address = str(b.address);
  const area = str(b.area);
  const city = str(b.city);
  const pincode = str(b.pincode);
  const note = str(b.note).slice(0, 500);

  if (fullName.length < 2) f.fullName = 'Please enter your full name';
  if (!mobile) f.mobile = 'Enter a valid 10-digit mobile number';
  if (!whatsapp) f.whatsapp = 'Enter a valid 10-digit WhatsApp number';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) f.email = 'Enter a valid email address';
  if (address.length < 5) f.address = 'Please enter your full address';
  if (!area) f.area = 'Please enter your area / locality';
  if (!city) f.city = 'Please enter your city';
  if (!/^\d{6}$/.test(pincode)) f.pincode = 'Enter a valid 6-digit PIN code';

  const items = Array.isArray(b.items) ? b.items : [];
  const cleanItems = items
    .map((i) => ({ productId: str(i?.productId), quantity: Math.floor(Number(i?.quantity)) }))
    .filter((i) => i.productId && i.quantity >= 1);
  if (!cleanItems.length) f.items = 'Your cart is empty';

  if (Object.keys(f).length) throw new HttpError(400, 'Please fix the highlighted fields', f);
  return { fullName, mobile, whatsapp, email, address, area, city, pincode, note, items: cleanItems, whatsappOptIn: b.whatsappOptIn === true };
}

export const create = asyncHandler(async (req, res) => {
  const input = validate(req.body || {});
  const order = await createOrder(input);
  const whatsappDelivery = input.whatsappOptIn
    ? await sendOrderTemplate(order, 'order_placed')
    : { status: 'not_requested' };
  res.status(201).json({ ...order, whatsapp_delivery: whatsappDelivery });
});

export const get = asyncHandler(async (req, res) => {
  const token = str(req.query.t);
  if (!token) throw new HttpError(404, 'Order not found');
  res.json(await getOrderWithToken(str(req.params.id).toUpperCase(), token));
});

export const track = asyncHandler(async (req, res) => {
  const code = str(req.body?.orderId).toUpperCase();
  const mobile = normalizeMobile(req.body?.mobile);
  const fields = {};
  if (!/^RE-\d{3,10}$/.test(code)) fields.orderId = 'Invalid Order ID (example: RE-10482)';
  if (!mobile) fields.mobile = 'Invalid mobile number';
  if (Object.keys(fields).length) throw new HttpError(400, 'Please check the details you entered', fields);
  res.json(await trackOrder(code, mobile));
});
