import { formatINR } from './format.js';
import { PAYMENT_STATUS_LABEL } from './status.js';

export function toWaNumber(n) {
  const d = String(n || '').replace(/\D/g, '');
  return d.length === 10 ? '91' + d : d;
}

export const waLink = (number, text) => `https://wa.me/${toWaNumber(number)}?text=${encodeURIComponent(text)}`;

export const trackUrl = (orderCode) => `${window.location.origin}/track-order?id=${encodeURIComponent(orderCode)}`;

const DEFAULT_TEMPLATE = `Hello {CUSTOMER_NAME},

Your order has been placed successfully with Royal Enterprise.

Order ID: {ORDER_ID}

Items:
{ITEMS}

Total: {TOTAL}

Payment Status: {PAYMENT_STATUS}

Our team will contact you shortly regarding payment and delivery.

Track your order:
{TRACK_URL}

Thank you for shopping with Royal Enterprise.`;

// Built from the real order. The wording comes from the editable "order_placed" template.
export function buildOrderMessage(order, template) {
  const values = {
    CUSTOMER_NAME: order.customer_name,
    ORDER_ID: order.order_code,
    ITEMS: order.items.map((i) => `${i.name} x${i.quantity}`).join('\n'),
    TOTAL: formatINR(order.total),
    PAYMENT_STATUS: PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status,
    STATUS: order.order_status,
    TRACK_URL: trackUrl(order.order_code),
  };
  return (template || DEFAULT_TEMPLATE).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
}
