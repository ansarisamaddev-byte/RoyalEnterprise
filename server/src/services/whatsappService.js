import { supabase } from '../config/supabase.js';
import { normalizeMobile } from '../utils/phone.js';

const TEMPLATE_KEYS = new Set([
  'order_placed', 'order_status_updated', 'order_cancelled', 'out_of_stock',
  'payment_received', 'out_for_delivery', 'delivered',
]);

function config() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v22.0';
  if (!token || !phoneNumberId) return null;
  if (!/^v\d+\.\d+$/.test(version)) throw new Error('WHATSAPP_API_VERSION must look like v22.0');
  return { token, phoneNumberId, version };
}

function templateNames() {
  if (!process.env.WHATSAPP_TEMPLATE_NAMES) return {};
  const names = JSON.parse(process.env.WHATSAPP_TEMPLATE_NAMES);
  if (!names || typeof names !== 'object' || Array.isArray(names)) throw new Error('WHATSAPP_TEMPLATE_NAMES must be a JSON object');
  return names;
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function valuesFor(order) {
  const siteUrl = (process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  return {
    CUSTOMER_NAME: order.customer_name || '',
    ORDER_ID: order.order_code || '',
    ITEMS: (order.items || []).map((item) => `${item.name} x${item.quantity}`).join(', '),
    TOTAL: currency(order.total),
    PAYMENT_STATUS: order.payment_status === 'PAYMENT_PENDING' ? 'Payment pending' : String(order.payment_status || '').replaceAll('_', ' ').toLowerCase(),
    STATUS: String(order.order_status || '').replaceAll('_', ' ').toLowerCase(),
    TRACK_URL: `${siteUrl}/track-order?id=${encodeURIComponent(order.order_code || '')}`,
  };
}

export async function sendOrderTemplate(order, key = 'order_placed') {
  if (!TEMPLATE_KEYS.has(key)) return { status: 'failed', reason: 'unknown_template' };
  let settings;
  try {
    settings = config();
  } catch {
    return { status: 'failed', reason: 'invalid_configuration' };
  }
  if (!settings) return { status: 'not_configured' };

  const recipient = normalizeMobile(order.whatsapp || order.mobile);
  if (!recipient) return { status: 'failed', reason: 'invalid_recipient' };

  try {
    const [templateResult, names] = await Promise.all([
      supabase.from('admin_message_templates').select('body').eq('key', key).maybeSingle(),
      Promise.resolve(templateNames()),
    ]);
    if (templateResult.error) throw templateResult.error;
    if (!templateResult.data?.body) return { status: 'failed', reason: 'template_not_found' };

    const templateName = String(names[key] || key);
    if (!/^[a-z0-9_]+$/.test(templateName)) return { status: 'failed', reason: 'invalid_template_name' };
    const values = valuesFor(order);
    const placeholders = [...templateResult.data.body.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const parameters = placeholders.map((name) => ({ type: 'text', text: String(values[name] ?? `{${name}}`).slice(0, 1024) }));
    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: `91${recipient}`,
      type: 'template',
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' },
        ...(parameters.length ? { components: [{ type: 'body', parameters }] } : {}),
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(`https://graph.facebook.com/${settings.version}/${settings.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn(`WhatsApp template send failed (${key}, HTTP ${response.status}, provider code ${payload.error?.code ?? 'unknown'})`);
      return { status: 'failed', reason: 'provider_rejected' };
    }
    return { status: 'sent', message_id: payload.messages?.[0]?.id || null };
  } catch (error) {
    console.warn(`WhatsApp template send failed (${key}): ${error.name === 'AbortError' ? 'timeout' : 'request_error'}`);
    return { status: 'failed', reason: error.name === 'AbortError' ? 'timeout' : 'request_error' };
  }
}