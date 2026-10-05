const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    err.fields = data.fields;
    throw err;
  }
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  getSettings: () => request('/settings'),
  getCategories: () => request('/categories'),
  getProducts: (params) => request('/products' + qs(params)),
  getProduct: (id) => request(`/products/${encodeURIComponent(id)}`),
  createOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrder: (code, token) => request(`/orders/${encodeURIComponent(code)}${qs({ t: token })}`),
  trackOrder: (body) => request('/orders/track', { method: 'POST', body: JSON.stringify(body) }),
};
