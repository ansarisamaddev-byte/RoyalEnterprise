const BASE = (import.meta.env.VITE_API_URL || '/api') + '/admin';
const TOKEN_KEY = 're_admin_session';

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { body, method = 'GET', auth = true } = {}) {
  let response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(auth && getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && auth) {
      clearAdminToken();
      window.dispatchEvent(new Event('admin:unauthorized'));
    }
    throw new Error(data.error || 'The request could not be completed.');
  }
  if (auth && method !== 'GET') {
    const timestamp = String(Date.now());
    localStorage.setItem('re_store_settings_updated', timestamp);
    window.dispatchEvent(new Event('re_store_settings_updated'));
  }
  return data;
}

const json = (method, body) => ({ method, body });

export const adminApi = {
  login: (password) => request('/session', { ...json('POST', { password }), auth: false }),
  overview: () => request('/overview'),
  products: () => request('/products'),
  createProduct: (body) => request('/products', json('POST', body)),
  updateProduct: (id, body) => request(`/products/${encodeURIComponent(id)}`, json('PATCH', body)),
  deleteProduct: (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  categories: () => request('/categories'),
  createCategory: (body) => request('/categories', json('POST', body)),
  updateCategory: (id, body) => request(`/categories/${encodeURIComponent(id)}`, json('PATCH', body)),
  createSubcategory: (id, body) => request(`/categories/${encodeURIComponent(id)}/subcategories`, json('POST', body)),
  orders: () => request('/orders'),
  updateOrder: (id, body) => request(`/orders/${encodeURIComponent(id)}`, json('PATCH', body)),
  settings: () => request('/settings'),
  updateSettings: (body) => request('/settings', json('PATCH', body)),
  tabs: () => request('/product-tabs'),
  updateTab: (key, body) => request(`/product-tabs/${encodeURIComponent(key)}`, json('PATCH', body)),
  createTab: (body) => request('/product-tabs', json('POST', body)),
  templates: () => request('/message-templates'),
  updateTemplate: (key, body) => request(`/message-templates/${encodeURIComponent(key)}`, json('PATCH', body)),
};