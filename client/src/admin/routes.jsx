import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { formatDate, formatINR } from '../utils/format.js';
import { adminApi, clearAdminToken, getAdminToken, setAdminToken } from './api.js';
import './admin.css';

const NAV = [
  { key: 'overview', label: 'Dashboard', icon: 'home' },
  { key: 'orders', label: 'Orders', icon: 'package' },
  { key: 'products', label: 'Products', icon: 'tag' },
  { key: 'categories', label: 'Categories', icon: 'phone' },
  { key: 'settings', label: 'Store settings', icon: 'plug' },
];

function Notice({ error, success }) {
  if (!error && !success) return null;
  return <div className={`admin-notice${error ? ' is-error' : ' is-success'}`} role="status">{error || success}</div>;
}

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await adminApi.login(password);
      setAdminToken(session.token);
      onLogin(session.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="login-brand"><span><Icon name="crown" size={27} /></span><b>ROYAL<br />ENTERPRISE</b></div>
      <div className="login-rule" />
      <p className="admin-kicker">STORE OPERATIONS</p>
      <h1>Admin sign in</h1>
      <p className="admin-muted">Use the admin password configured on your server.</p>
      <form onSubmit={submit} className="admin-form login-form">
        <label className="admin-field"><span>Password</span><input autoFocus type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <Notice error={error} />}
        <button className="admin-button primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<Icon name="right" size={16} /></button>
      </form>
      <Link className="login-back" to="/">Return to customer store</Link>
    </main>
  );
}

function PageHeader({ eyebrow, title, detail, action }) {
  return <header className="admin-page-head"><div><p className="admin-kicker">{eyebrow}</p><h1>{title}</h1>{detail && <p className="admin-muted">{detail}</p>}</div>{action}</header>;
}

function Overview() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([adminApi.overview(), adminApi.orders()]).then(([counts, list]) => {
      setSummary(counts);
      setOrders(list.orders.slice(0, 5));
    }).catch((err) => setError(err.message));
  }, []);

  const metrics = [
    ['New orders', summary?.new_orders, 'Awaiting confirmation', 'gold'],
    ['Total orders', summary?.orders, 'All time', 'dark'],
    ['Active products', summary?.active_products, 'Visible in the store', 'green'],
    ['Categories', summary?.active_categories, 'Visible to customers', 'blue'],
  ];

  return <>
    <PageHeader eyebrow="STORE OVERVIEW" title="Good day, Admin" detail="A quick read on what is happening across your store." />
    <Notice error={error} />
    <div className="metric-grid">{metrics.map(([label, value, hint, tone]) => <div className={`metric metric-${tone}`} key={label}><span>{label}</span><strong>{value ?? '—'}</strong><small>{hint}</small></div>)}</div>
    <section className="admin-section">
      <div className="section-title"><div><p className="admin-kicker">LATEST ACTIVITY</p><h2>Recent orders</h2></div><span className="admin-count">Latest 5</span></div>
      {orders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="strong">{order.order_code}</td><td>{order.customer_name}</td><td>{formatDate(order.created_at)}</td><td>{formatINR(order.total)}</td><td><StatusPill status={order.order_status} /></td></tr>)}</tbody></table></div> : <p className="admin-empty">{summary ? 'No orders have been placed yet.' : 'Loading store activity…'}</p>}
    </section>
  </>;
}

const ORDER_STATES = ['ORDER_PLACED', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CUSTOMER_CANCELLED', 'CANCELLED', 'OUT_OF_STOCK'];
const PAYMENT_STATES = ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'REFUNDED'];
const human = (value = '') => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function StatusPill({ status }) {
  const tone = ['DELIVERED', 'PAYMENT_RECEIVED'].includes(status) ? 'green' : ['CANCELLED', 'CUSTOMER_CANCELLED', 'OUT_OF_STOCK', 'REFUNDED'].includes(status) ? 'red' : ['ORDER_PLACED', 'PAYMENT_PENDING'].includes(status) ? 'gold' : 'blue';
  return <span className={`status-pill ${tone}`}>{human(status)}</span>;
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [updated, setUpdated] = useState('');
  const refresh = () => adminApi.orders().then((data) => setOrders(data.orders)).catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, []);

  async function change(order, field, value) {
    setBusy(`${order.id}-${field}`);
    setError('');
    try {
      await adminApi.updateOrder(order.id, { [field]: value });
      setOrders((items) => items.map((item) => item.id === order.id ? { ...item, [field]: value } : item));
      setUpdated(`${order.order_code} updated`);
      window.setTimeout(() => setUpdated(''), 2600);
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }

  const filtered = orders.filter((order) => `${order.order_code} ${order.customer_name} ${order.mobile}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHeader eyebrow="FULFILMENT" title="Orders" detail="Review incoming orders and update fulfilment and payment status." />
    <Notice error={error} success={updated} />
    <div className="toolbar"><label className="admin-search"><Icon name="search" size={17} /><input aria-label="Search orders" placeholder="Search order, customer or mobile" value={query} onChange={(e) => setQuery(e.target.value)} /></label><span className="admin-count">{filtered.length} orders</span></div>
    <div className="orders-list">{filtered.map((order) => <article className="order-card" key={order.id}>
      <div className="order-top"><div><span className="admin-kicker">{order.order_code}</span><h2>{order.customer_name}</h2><p className="admin-muted">{order.mobile} · {formatDate(order.created_at)}</p></div><strong className="order-total">{formatINR(order.total)}</strong></div>
      <div className="order-items">{(order.order_items || []).map((item) => <div className="order-item" key={item.id}><span>{item.product_name} <small>× {item.quantity}</small></span><span>{formatINR(item.line_total)}</span></div>)}<div className="order-item total-line"><span>Delivery</span><span>{Number(order.delivery_charge) ? formatINR(order.delivery_charge) : 'Free'}</span></div></div>
      <div className="order-controls"><label className="admin-field"><span>Order status</span><select value={order.order_status} disabled={busy === `${order.id}-order_status`} onChange={(e) => change(order, 'order_status', e.target.value)}>{ORDER_STATES.map((status) => <option key={status} value={status}>{human(status)}</option>)}</select></label><label className="admin-field"><span>Payment</span><select value={order.payment_status} disabled={busy === `${order.id}-payment_status`} onChange={(e) => change(order, 'payment_status', e.target.value)}>{PAYMENT_STATES.map((status) => <option key={status} value={status}>{human(status)}</option>)}</select></label><details className="order-address"><summary>Delivery details</summary><p>{order.address}, {order.area}, {order.city} {order.pincode}</p>{order.note && <small>Note: {order.note}</small>}</details></div>
    </article>)}{!filtered.length && <p className="admin-empty">{orders.length ? 'No matching orders.' : 'No orders to show yet.'}</p>}</div>
  </>;
}

const EMPTY_PRODUCT = { name: '', slug: '', category_id: '', brand: '', description: '', price: '', original_price: '', stock: 0, thumbnail_url: '', is_active: true, is_featured: false };

function ProductEditor({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(product ? { ...EMPTY_PRODUCT, ...product, category_id: product.category_id || '' } : EMPTY_PRODUCT);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { ...form, price: Number(form.price), stock: Number(form.stock), original_price: form.original_price === '' ? null : Number(form.original_price), category_id: form.category_id || null };
    try { if (product) await adminApi.updateProduct(product.id, body); else await adminApi.createProduct(body); onSaved(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
    <div className="modal-head"><div><p className="admin-kicker">CATALOGUE</p><h2 id="product-editor-title">{product ? 'Edit product' : 'Add product'}</h2></div><button className="admin-icon-button" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
    <form className="admin-form" onSubmit={submit}><div className="editor-grid">
      <label className="admin-field"><span>Product name</span><input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
      <label className="admin-field"><span>URL slug</span><input value={form.slug} onChange={(e) => set('slug', e.target.value)} required /></label>
      <label className="admin-field"><span>Category</span><select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="admin-field"><span>Brand</span><input value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} /></label>
      <label className="admin-field"><span>Price (₹)</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} required /></label>
      <label className="admin-field"><span>Original price (₹)</span><input type="number" min="0" step="0.01" value={form.original_price ?? ''} onChange={(e) => set('original_price', e.target.value)} /></label>
      <label className="admin-field"><span>Stock</span><input type="number" min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} required /></label>
      <label className="admin-field"><span>Image URL</span><input type="url" value={form.thumbnail_url || ''} onChange={(e) => set('thumbnail_url', e.target.value)} /></label>
      <label className="admin-field full"><span>Description</span><textarea rows="3" value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
    </div><div className="inline-checks"><label className="admin-check"><input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />Visible in store</label><label className="admin-check"><input type="checkbox" checked={!!form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />Featured</label></div>
      <Notice error={error} /><div className="modal-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Cancel</button><button className="admin-button primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div>
    </form>
  </section></div>;
}

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const refresh = () => Promise.all([adminApi.products(), adminApi.categories()]).then(([p, c]) => { setProducts(p.products); setCategories(c.categories); }).catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, []);
  async function remove(product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try { await adminApi.deleteProduct(product.id); setProducts((rows) => rows.filter((row) => row.id !== product.id)); setSuccess('Product deleted'); }
    catch (err) { setError(err.message); }
  }
  const filtered = products.filter((product) => `${product.name} ${product.brand || ''} ${product.slug}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHeader eyebrow="CATALOGUE" title="Products" detail="Manage products displayed in the customer store." action={<button className="admin-button primary" onClick={() => setEditing(null)}><Icon name="plus" size={17} />Add product</button>} />
    <Notice error={error} success={success} />
    <div className="toolbar"><label className="admin-search"><Icon name="search" size={17} /><input aria-label="Search products" placeholder="Search products or brands" value={query} onChange={(e) => setQuery(e.target.value)} /></label><span className="admin-count">{filtered.length} products</span></div>
    <div className="admin-table-wrap"><table className="admin-table product-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><div className="product-cell">{product.thumbnail_url ? <img src={product.thumbnail_url} alt="" /> : <span className="product-placeholder"><Icon name="package" /></span>}<div><b>{product.name}</b><small>{product.brand || product.slug}</small></div></div></td><td>{product.category?.name || '—'}</td><td>{formatINR(product.price)}</td><td>{product.stock}</td><td><span className={`visibility-dot${product.is_active ? ' active' : ''}`}>{product.is_active ? 'Active' : 'Hidden'}</span></td><td><div className="row-actions"><button className="admin-text-button" onClick={() => setEditing(product)}>Edit</button><button className="admin-text-button danger" onClick={() => remove(product)}>Delete</button></div></td></tr>)}</tbody></table>{!filtered.length && <p className="admin-empty">{products.length ? 'No matching products.' : 'No products found.'}</p>}</div>
    {editing !== undefined && <ProductEditor product={editing || null} categories={categories} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setSuccess('Product saved'); refresh(); }} />}
  </>;
}

function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', section: 'electronics', icon: 'package' });
  const [subForms, setSubForms] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const refresh = () => adminApi.categories().then((data) => setCategories(data.categories)).catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, []);
  async function addCategory(event) {
    event.preventDefault(); setError('');
    try { await adminApi.createCategory(form); setForm({ name: '', slug: '', section: 'electronics', icon: 'package' }); setSuccess('Category added to the store'); refresh(); }
    catch (err) { setError(err.message); }
  }
  async function toggle(category) {
    try { await adminApi.updateCategory(category.id, { is_active: !category.is_active }); refresh(); }
    catch (err) { setError(err.message); }
  }
  async function addSubcategory(event, category) {
    event.preventDefault();
    const value = subForms[category.id] || { name: '', slug: '' };
    try { await adminApi.createSubcategory(category.id, value); setSubForms((current) => ({ ...current, [category.id]: { name: '', slug: '' } })); setSuccess(`Subcategory added under ${category.name}`); refresh(); }
    catch (err) { setError(err.message); }
  }
  return <>
    <PageHeader eyebrow="STORE NAVIGATION" title="Categories" detail="Active categories appear in customer navigation and product listings." />
    <Notice error={error} success={success} />
    <section className="admin-section category-create"><div className="section-title"><div><p className="admin-kicker">NEW CATEGORY</p><h2>Add a category</h2></div></div><form className="category-form" onSubmit={addCategory}><label className="admin-field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') })} required /></label><label className="admin-field"><span>Slug</span><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label><label className="admin-field"><span>Section</span><select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}><option value="electronics">Electronics</option><option value="mobiles">Mobiles</option></select></label><button className="admin-button primary"><Icon name="plus" size={16} />Add category</button></form></section>
    <div className="category-list">{categories.map((category) => <article className={`category-row${category.is_active ? '' : ' disabled'}`} key={category.id}><div className="category-main"><span className="category-symbol"><Icon name={category.icon || 'package'} size={19} /></span><div><b>{category.name}</b><small>/{category.slug} · {human(category.section)}</small></div><label className="switch-control"><span>{category.is_active ? 'Visible' : 'Hidden'}</span><input type="checkbox" checked={!!category.is_active} onChange={() => toggle(category)} aria-label={`${category.is_active ? 'Hide' : 'Show'} ${category.name}`} /><i /></label></div>{category.sub_categories?.length > 0 && <div className="subcategory-list">{category.sub_categories.map((sub) => <span key={sub.id}>{sub.name}</span>)}</div>}<form className="subcategory-form" onSubmit={(e) => addSubcategory(e, category)}><input aria-label={`New subcategory name for ${category.name}`} placeholder="Subcategory name" value={subForms[category.id]?.name || ''} onChange={(e) => setSubForms((current) => ({ ...current, [category.id]: { name: e.target.value, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') } }))} required /><button className="admin-text-button">Add subcategory</button></form></article>)}</div>
  </>;
}

function Settings() {
  const [settings, setSettings] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateDraft, setTemplateDraft] = useState(null);
  const [newTab, setNewTab] = useState({ key: '', label: '', content: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([adminApi.settings(), adminApi.tabs(), adminApi.templates()]).then(([s, t, m]) => {
      setSettings(s.settings); setTabs(t.tabs); setTemplates(m.templates); setSelectedTemplate(m.templates[0]?.key || '');
    }).catch((err) => setError(err.message));
  }, []);
  useEffect(() => setTemplateDraft(templates.find((template) => template.key === selectedTemplate) || null), [templates, selectedTemplate]);
  if (!settings) return <><PageHeader eyebrow="CONFIGURATION" title="Store settings" detail="Configure customer-facing store information." /><Notice error={error} /><p className="admin-empty">Loading configuration…</p></>;

  async function saveSettings(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try { const result = await adminApi.updateSettings({ store_name: settings.store_name, store_tagline: settings.store_tagline, store_phone: settings.store_phone, store_whatsapp: settings.store_whatsapp, store_address: settings.store_address, delivery_charge: Number(settings.delivery_charge) || 0 }); setSettings(result.settings); setSuccess('Store settings saved'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function toggleTab(tab, enabled) {
    try { const updated = await adminApi.updateTab(tab.key, { is_enabled: enabled }); setTabs((rows) => rows.map((row) => row.key === tab.key ? updated : row)); setSuccess(`${tab.label} tab ${enabled ? 'enabled' : 'hidden'}`); }
    catch (err) { setError(err.message); }
  }
  async function addTab(event) {
    event.preventDefault();
    try { const tab = await adminApi.createTab(newTab); setTabs((rows) => [...rows, tab].sort((a, b) => a.sort_order - b.sort_order)); setNewTab({ key: '', label: '', content: '' }); setSuccess('Product tab added'); }
    catch (err) { setError(err.message); }
  }
  async function saveTemplate(event) {
    event.preventDefault(); if (!templateDraft) return;
    try { const saved = await adminApi.updateTemplate(templateDraft.key, { label: templateDraft.label, body: templateDraft.body }); setTemplates((rows) => rows.map((row) => row.key === saved.key ? saved : row)); setSuccess('WhatsApp template saved'); }
    catch (err) { setError(err.message); }
  }
  return <>
    <PageHeader eyebrow="CONFIGURATION" title="Store settings" detail="Changes flow into the customer store and future orders." />
    <Notice error={error} success={success} />
    <form className="settings-layout" onSubmit={saveSettings}>
      <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">CUSTOMER-FACING</p><h2>Store details</h2></div></div><div className="settings-grid">
        <label className="admin-field"><span>Store name</span><input value={settings.store_name || ''} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} /></label>
        <label className="admin-field"><span>Tagline</span><input value={settings.store_tagline || ''} onChange={(e) => setSettings({ ...settings, store_tagline: e.target.value })} /></label>
        <label className="admin-field"><span>Phone</span><input value={settings.store_phone || ''} onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })} /></label>
        <label className="admin-field"><span>WhatsApp number</span><input value={settings.store_whatsapp || ''} onChange={(e) => setSettings({ ...settings, store_whatsapp: e.target.value })} /></label>
        <label className="admin-field"><span>Delivery charge (₹)</span><input type="number" min="0" step="0.01" value={settings.delivery_charge ?? 0} onChange={(e) => setSettings({ ...settings, delivery_charge: e.target.value })} /></label>
        <label className="admin-field full"><span>Store address</span><textarea rows="2" value={settings.store_address || ''} onChange={(e) => setSettings({ ...settings, store_address: e.target.value })} /></label>
      </div><button className="admin-button primary" disabled={busy}>{busy ? 'Saving…' : 'Save store details'}</button></section>
    </form>
    <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">PRODUCT DETAILS</p><h2>Information tabs</h2><p className="admin-muted">Hidden tabs are removed from product pages.</p></div></div><div className="tab-settings">{tabs.map((tab) => <label className="tab-setting" key={tab.key}><span><b>{tab.label}</b><small>{tab.is_custom ? 'Custom tab' : `Built-in · ${tab.key}`}</small></span><input type="checkbox" checked={tab.is_enabled} onChange={(e) => toggleTab(tab, e.target.checked)} aria-label={`${tab.is_enabled ? 'Hide' : 'Show'} ${tab.label} tab`} /></label>)}</div><form className="custom-tab-form" onSubmit={addTab}><label className="admin-field"><span>New tab key</span><input value={newTab.key} onChange={(e) => setNewTab({ ...newTab, key: e.target.value })} placeholder="shipping-info" required /></label><label className="admin-field"><span>Label</span><input value={newTab.label} onChange={(e) => setNewTab({ ...newTab, label: e.target.value })} placeholder="Shipping" required /></label><label className="admin-field"><span>Content</span><input value={newTab.content} onChange={(e) => setNewTab({ ...newTab, content: e.target.value })} placeholder="Shown on product pages" /></label><button className="admin-button secondary"><Icon name="plus" size={16} />Add tab</button></form></section>
    <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">WHATSAPP</p><h2>Message templates</h2></div></div><form className="template-form" onSubmit={saveTemplate}><label className="admin-field"><span>Template</span><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>{templates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}</select></label>{templateDraft && <><label className="admin-field"><span>Template label</span><input value={templateDraft.label} onChange={(e) => setTemplateDraft({ ...templateDraft, label: e.target.value })} /></label><label className="admin-field"><span>Message body</span><textarea rows="9" value={templateDraft.body} onChange={(e) => setTemplateDraft({ ...templateDraft, body: e.target.value })} /></label><p className="admin-hint">Template variables such as {'{CUSTOMER_NAME}'} and {'{ORDER_ID}'} are preserved when sent.</p><button className="admin-button secondary">Save template</button></>}</form></section>
  </>;
}

export default function AdminApp() {
  const [token, setToken] = useState(getAdminToken());
  const [view, setView] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    const reset = () => { clearAdminToken(); setToken(''); };
    window.addEventListener('admin:unauthorized', reset);
    return () => window.removeEventListener('admin:unauthorized', reset);
  }, []);
  if (!token) return <Login onLogin={setToken} />;
  const logout = () => { clearAdminToken(); setToken(''); };
  const Page = { overview: Overview, orders: Orders, products: Products, categories: Categories, settings: Settings }[view] || Overview;
  return <div className="admin-app">
    <aside className={`admin-sidebar${mobileNav ? ' mobile-open' : ''}`}>
      <div className="admin-brand"><span className="admin-brand-mark"><Icon name="crown" size={22} /></span><span><b>ROYAL</b><small>ENTERPRISE</small></span></div>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="admin-nav" aria-label="Admin sections">{NAV.map((item) => <button className={view === item.key ? 'selected' : ''} key={item.key} onClick={() => { setView(item.key); setMobileNav(false); }}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.key === 'orders' && <i />}</button>)}</nav>
      <div className="sidebar-bottom"><Link to="/" target="_blank"><Icon name="right" size={16} />View customer store</Link><button onClick={logout}><Icon name="lock" size={16} />Sign out</button><small>ROYAL ENTERPRISE · ADMIN</small></div>
    </aside>
    <div className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" onClick={() => setMobileNav((open) => !open)} aria-label="Toggle navigation"><span /><span /><span /></button><span className="topbar-context">Store management</span><span className="topbar-live"><i />Connected</span><Link to="/" className="topbar-store">Customer store <Icon name="right" size={14} /></Link></header><main className="admin-content"><Page /></main></div>
  </div>;
}