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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = await adminApi.login(username, password);
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
        <label className="admin-field"><span>Username</span><input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label className="admin-field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
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

function Pager({ page, total, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return <div className="admin-pager"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span><div><button className="admin-button secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="admin-button secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
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
const MESSAGE_TEMPLATES = ['order_placed', 'order_status_updated', 'order_cancelled', 'out_of_stock', 'payment_received', 'out_for_delivery', 'delivered'];
const human = (value = '') => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function StatusPill({ status }) {
  const tone = ['DELIVERED', 'PAYMENT_RECEIVED'].includes(status) ? 'green' : ['CANCELLED', 'CUSTOMER_CANCELLED', 'OUT_OF_STOCK', 'REFUNDED'].includes(status) ? 'red' : ['ORDER_PLACED', 'PAYMENT_PENDING'].includes(status) ? 'gold' : 'blue';
  return <span className={`status-pill ${tone}`}>{human(status)}</span>;
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [updated, setUpdated] = useState('');
  const [messageKeys, setMessageKeys] = useState({});
  const [messageResults, setMessageResults] = useState({});
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

  async function sendMessage(order) {
    const key = messageKeys[order.id] || 'order_status_updated';
    setBusy(`message-${order.id}`);
    setError('');
    try {
      const result = await adminApi.sendOrderMessage(order.id, key);
      setMessageResults((current) => ({ ...current, [order.id]: { key, status: result.status } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }

  const cutoff = dateFilter === 'today' ? new Date(new Date().setHours(0, 0, 0, 0)) : dateFilter === 'week' ? new Date(Date.now() - 7 * 86400000) : dateFilter === 'month' ? new Date(Date.now() - 30 * 86400000) : null;
  const filtered = orders.filter((order) =>
    `${order.order_code} ${order.customer_name} ${order.mobile}`.toLowerCase().includes(query.toLowerCase()) &&
    (statusFilter === 'all' || order.order_status === statusFilter) &&
    (!cutoff || new Date(order.created_at) >= cutoff)
  );
  const pageSize = 15;
  const visibleOrders = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <>
    <PageHeader eyebrow="FULFILMENT" title="Orders" detail="Review incoming orders and update fulfilment and payment status." />
    <Notice error={error} success={updated} />
    <div className="toolbar"><label className="admin-search"><Icon name="search" size={17} /><input aria-label="Search orders" placeholder="Search order, customer or mobile" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label><label className="admin-field compact-filter"><span>Status</span><select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option value="all">All statuses</option>{ORDER_STATES.map((status) => <option key={status} value={status}>{human(status)}</option>)}</select></label><label className="admin-field compact-filter"><span>Period</span><select value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}><option value="all">Any time</option><option value="today">Today</option><option value="week">7 days</option><option value="month">30 days</option></select></label><span className="admin-count">{filtered.length} orders</span></div>
    <div className="orders-list">{visibleOrders.map((order) => <article className="order-card" key={order.id}>
      <div className="order-top"><div><span className="admin-kicker">{order.order_code}</span><h2>{order.customer_name}</h2><p className="admin-muted">{order.mobile} · {formatDate(order.created_at)}</p></div><strong className="order-total">{formatINR(order.total)}</strong></div>
      <div className="order-items">{(order.order_items || []).map((item) => <div className="order-item" key={item.id}><span>{item.product_name} <small>× {item.quantity}</small></span><span>{formatINR(item.line_total)}</span></div>)}<div className="order-item total-line"><span>Delivery</span><span>{Number(order.delivery_charge) ? formatINR(order.delivery_charge) : 'Free'}</span></div></div>
      <div className="order-controls"><label className="admin-field"><span>Order status</span><select value={order.order_status} disabled={busy === `${order.id}-order_status`} onChange={(e) => change(order, 'order_status', e.target.value)}>{ORDER_STATES.map((status) => <option key={status} value={status}>{human(status)}</option>)}</select></label><label className="admin-field"><span>Payment</span><select value={order.payment_status} disabled={busy === `${order.id}-payment_status`} onChange={(e) => change(order, 'payment_status', e.target.value)}>{PAYMENT_STATES.map((status) => <option key={status} value={status}>{human(status)}</option>)}</select></label><details className="order-address"><summary>Delivery details</summary><p>{order.address}, {order.area}, {order.city} {order.pincode}</p>{order.note && <small>Note: {order.note}</small>}</details></div>
      <div className="order-message"><label className="admin-field"><span>Customer message</span><select value={messageKeys[order.id] || 'order_status_updated'} onChange={(e) => setMessageKeys((current) => ({ ...current, [order.id]: e.target.value }))}>{MESSAGE_TEMPLATES.map((key) => <option value={key} key={key}>{human(key)}</option>)}</select></label><button className="admin-button secondary" disabled={!order.whatsapp_opt_in || busy === `message-${order.id}`} onClick={() => sendMessage(order)}><Icon name="whatsapp" size={16} />{busy === `message-${order.id}` ? 'Sending…' : 'Send WhatsApp'}</button><small>{order.whatsapp_opt_in ? `Opted in · ${order.whatsapp || order.mobile}` : 'Customer has not opted in to WhatsApp updates.'}</small>{messageResults[order.id] && <small role="status">{messageResults[order.id].status === 'sent' ? `${human(messageResults[order.id].key)} submitted to WhatsApp.` : messageResults[order.id].status === 'not_configured' ? 'WhatsApp Cloud API is not configured.' : 'Message was not sent. Check the server provider setup.'}</small>}</div>
    </article>)}{!filtered.length && <p className="admin-empty">{orders.length ? 'No matching orders.' : 'No orders to show yet.'}</p>}</div><Pager page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
  </>;
}

const EMPTY_PRODUCT = { name: '', slug: '', category_id: '', subcategory_id: '', brand: '', description: '', price: '', original_price: '', stock: 0, thumbnail_url: '', image_urls: [], highlights: [], is_active: true, is_featured: false };
const DETAIL_SECTIONS = [
  { key: 'specifications', label: 'Specifications', title: 'specification', fields: [['spec_key', 'Name'], ['spec_value', 'Value']] },
  { key: 'reviews', label: 'Reviews', title: 'review', fields: [['customer_name', 'Customer name'], ['rating', 'Rating'], ['review', 'Review']] },
  { key: 'offers', label: 'Offers', title: 'offer', fields: [['title', 'Offer title'], ['description', 'Description'], ['discount_text', 'Discount label'], ['image_url', 'Image URL']] },
  { key: 'warranties', label: 'Warranty', title: 'warranty', fields: [['title', 'Warranty title'], ['duration', 'Duration'], ['description', 'Details']] },
];

function emptyEntry(resource) {
  if (resource === 'specifications') return { spec_key: '', spec_value: '' };
  if (resource === 'reviews') return { customer_name: '', rating: 5, review: '', is_visible: true };
  if (resource === 'offers') return { title: '', description: '', discount_text: '', image_url: '' };
  return { title: '', duration: '', description: '' };
}

function ProductEditor({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(product ? { ...EMPTY_PRODUCT, ...product, category_id: product.category_id || '' } : EMPTY_PRODUCT);
  const [savedProduct, setSavedProduct] = useState(product);
  const [section, setSection] = useState('details');
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState(emptyEntry('specifications'));
  const [editingEntry, setEditingEntry] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!savedProduct || section === 'details') return;
    let active = true;
    setLoadingEntries(true);
    adminApi.productEntries(savedProduct.id, section).then((result) => {
      if (active) setEntries(result.entries);
    }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoadingEntries(false); });
    return () => { active = false; };
  }, [savedProduct?.id, section]);

  async function submitProduct(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { ...form, price: Number(form.price), stock: Number(form.stock), original_price: form.original_price === '' ? null : Number(form.original_price), category_id: form.category_id || null };
    try {
      const saved = savedProduct ? await adminApi.updateProduct(savedProduct.id, body) : await adminApi.createProduct(body);
      setSavedProduct(saved);
      onSaved(saved);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function submitEntry(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const saved = editingEntry
        ? await adminApi.updateProductEntry(savedProduct.id, section, editingEntry.id, draft)
        : await adminApi.createProductEntry(savedProduct.id, section, draft);
      setEntries((current) => editingEntry ? current.map((entry) => entry.id === saved.id ? saved : entry) : [...current, saved]);
      setDraft(emptyEntry(section)); setEditingEntry(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function deleteEntry(entry) {
    const label = entry.spec_key || entry.title || entry.customer_name;
    if (!window.confirm(`Delete this ${section === 'reviews' ? 'review' : section.slice(0, -1)}${label ? ` (${label})` : ''}?`)) return;
    try { await adminApi.deleteProductEntry(savedProduct.id, section, entry.id); setEntries((current) => current.filter((item) => item.id !== entry.id)); }
    catch (err) { setError(err.message); }
  }

  const activeDetail = DETAIL_SECTIONS.find((item) => item.key === section);
  const selectSection = (key) => {
    setSection(key);
    setDraft(emptyEntry(key));
    setEditingEntry(null);
  };
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
    <div className="modal-head"><div><p className="admin-kicker">CATALOGUE</p><h2 id="product-editor-title">{savedProduct ? 'Edit product' : 'Add product'}</h2>{savedProduct && <p className="admin-muted">{savedProduct.name}</p>}</div><button className="admin-icon-button" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
      <div className="product-editor-tabs" role="tablist" aria-label="Product editor sections">
        <button className={section === 'details' ? 'active' : ''} onClick={() => selectSection('details')}>Product details</button>
        {DETAIL_SECTIONS.map((item) => <button key={item.key} className={section === item.key ? 'active' : ''} disabled={!savedProduct} onClick={() => selectSection(item.key)}>{item.label}</button>)}
      </div>
    {section === 'details' ? <form className="admin-form" onSubmit={submitProduct}><div className="editor-grid">
      <label className="admin-field"><span>Product name</span><input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
      <label className="admin-field"><span>URL slug</span><input value={form.slug} onChange={(e) => set('slug', e.target.value)} required /></label>
      <label className="admin-field"><span>Category</span><select value={form.category_id} onChange={(e) => setForm((current) => ({ ...current, category_id: e.target.value, subcategory_id: '' }))}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="admin-field"><span>Subcategory</span><select value={form.subcategory_id || ''} onChange={(e) => set('subcategory_id', e.target.value)}><option value="">None</option>{(categories.find((category) => category.id === form.category_id)?.sub_categories || []).map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></label>
      <label className="admin-field"><span>Brand</span><input value={form.brand || ''} onChange={(e) => set('brand', e.target.value)} /></label>
      <label className="admin-field"><span>Price (₹)</span><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} required /></label>
      <label className="admin-field"><span>Original price (₹)</span><input type="number" min="0" step="0.01" value={form.original_price ?? ''} onChange={(e) => set('original_price', e.target.value)} /></label>
      <label className="admin-field"><span>Stock</span><input type="number" min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} required /></label>
      <label className="admin-field"><span>Thumbnail URL</span><input type="url" value={form.thumbnail_url || ''} onChange={(e) => set('thumbnail_url', e.target.value)} /></label>
      <label className="admin-field full"><span>Additional image URLs (one per line)</span><textarea rows="3" value={(form.image_urls || []).join('\n')} onChange={(e) => set('image_urls', e.target.value.split(/\n/).map((url) => url.trim()).filter(Boolean))} /></label>
      <label className="admin-field full"><span>Highlights (one per line)</span><textarea rows="3" value={(form.highlights || []).join('\n')} onChange={(e) => set('highlights', e.target.value.split(/\n/).map((line) => line.trim()).filter(Boolean))} /></label>
      <label className="admin-field full"><span>Description</span><textarea rows="3" value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
    </div><div className="inline-checks"><label className="admin-check"><input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />Visible in store</label><label className="admin-check"><input type="checkbox" checked={!!form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />Featured</label></div>
      <Notice error={error} /><div className="modal-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Close</button><button className="admin-button primary" disabled={busy}>{busy ? 'Saving…' : savedProduct ? 'Save product' : 'Create product'}</button></div>
    </form> : <section className="detail-editor"><div className="detail-entry-list">{loadingEntries ? <p className="admin-empty">Loading {activeDetail.label.toLowerCase()}…</p> : entries.map((entry) => <article className="detail-entry" key={entry.id}><div><b>{entry.spec_key || entry.title || entry.customer_name}{entry.rating && <span className="entry-rating"> · {entry.rating}/5</span>}</b><p>{entry.spec_value || entry.description || entry.review || [entry.duration, entry.discount_text].filter(Boolean).join(' · ') || entry.image_url}</p>{entry.is_visible === false && <small>Hidden on product page</small>}</div><div className="row-actions"><button className="admin-text-button" onClick={() => { setEditingEntry(entry); setDraft(Object.fromEntries(Object.keys(emptyEntry(section)).map((key) => [key, entry[key] ?? '']))); }}>Edit</button><button className="admin-text-button danger" onClick={() => deleteEntry(entry)}>Delete</button></div></article>)}{!loadingEntries && !entries.length && <p className="admin-empty">No {activeDetail.label.toLowerCase()} added.</p>}</div>
      <form className="entry-form" onSubmit={submitEntry}><div className="section-title"><div><p className="admin-kicker">{editingEntry ? 'EDIT ENTRY' : `ADD ${activeDetail.title.toUpperCase()}`}</p><h3>{editingEntry ? 'Update entry' : `New ${activeDetail.title}`}</h3></div></div><div className="entry-fields">{activeDetail.fields.map(([key, label]) => <label className={`admin-field${['description', 'review'].includes(key) ? ' full' : ''}`} key={key}><span>{label}</span>{key === 'rating' ? <select value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} / 5</option>)}</select> : ['description', 'review', 'spec_value'].includes(key) ? <textarea rows={key === 'spec_value' ? 2 : 3} value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} required={key === 'spec_value'} /> : <input type={key === 'image_url' ? 'url' : 'text'} value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} required={['spec_key', 'title', 'customer_name'].includes(key)} />}</label>)}{section === 'reviews' && <label className="admin-check"><input type="checkbox" checked={draft.is_visible !== false} onChange={(e) => setDraft({ ...draft, is_visible: e.target.checked })} />Show this review publicly</label>}</div><Notice error={error} /><div className="modal-actions">{editingEntry && <button type="button" className="admin-button secondary" onClick={() => { setEditingEntry(null); setDraft(emptyEntry(section)); }}>Cancel edit</button>}<button className="admin-button primary" disabled={busy}>{busy ? 'Saving…' : editingEntry ? 'Save changes' : `Add ${activeDetail.title}`}</button></div></form>
    </section>}
  </section></div>;
}

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const refresh = () => Promise.all([adminApi.products(), adminApi.categories()]).then(([p, c]) => { setProducts(p.products); setCategories(c.categories); }).catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, []);
  async function remove(product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try { await adminApi.deleteProduct(product.id); setProducts((rows) => rows.filter((row) => row.id !== product.id)); setSuccess('Product deleted'); }
    catch (err) { setError(err.message); }
  }
  const filtered = products.filter((product) =>
    `${product.name} ${product.brand || ''} ${product.slug}`.toLowerCase().includes(query.toLowerCase()) &&
    (categoryFilter === 'all' || product.category_id === categoryFilter) &&
    (visibilityFilter === 'all' || String(product.is_active) === visibilityFilter)
  );
  const pageSize = 20;
  const visibleProducts = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <>
    <PageHeader eyebrow="CATALOGUE" title="Products" detail="Manage products displayed in the customer store." action={<button className="admin-button primary" onClick={() => setEditing(null)}><Icon name="plus" size={17} />Add product</button>} />
    <Notice error={error} success={success} />
    <div className="toolbar"><label className="admin-search"><Icon name="search" size={17} /><input aria-label="Search products" placeholder="Search products or brands" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} /></label><label className="admin-field compact-filter"><span>Category</span><select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}><option value="all">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label className="admin-field compact-filter"><span>Visibility</span><select value={visibilityFilter} onChange={(e) => { setVisibilityFilter(e.target.value); setPage(1); }}><option value="all">All products</option><option value="true">Visible</option><option value="false">Hidden</option></select></label><span className="admin-count">{filtered.length} products</span></div>
    <div className="admin-table-wrap"><table className="admin-table product-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id}><td><div className="product-cell">{product.thumbnail_url ? <img src={product.thumbnail_url} alt="" /> : <span className="product-placeholder"><Icon name="package" /></span>}<div><b>{product.name}</b><small>{product.brand || product.slug}</small></div></div></td><td>{product.category?.name || '—'}</td><td>{formatINR(product.price)}</td><td>{product.stock}</td><td><span className={`visibility-dot${product.is_active ? ' active' : ''}`}>{product.is_active ? 'Active' : 'Hidden'}</span></td><td><div className="row-actions"><button className="admin-text-button" onClick={() => setEditing(product)}>Edit</button><button className="admin-text-button danger" onClick={() => remove(product)}>Delete</button></div></td></tr>)}</tbody></table>{!filtered.length && <p className="admin-empty">{products.length ? 'No matching products.' : 'No products found.'}</p>}</div><Pager page={page} total={filtered.length} pageSize={pageSize} onChange={setPage} />
    {editing !== undefined && <ProductEditor product={editing || null} categories={categories} onClose={() => setEditing(undefined)} onSaved={() => { setSuccess('Product saved'); refresh(); }} />}
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
    <section className="admin-section category-create"><div className="section-title"><div><p className="admin-kicker">NEW CATEGORY</p><h2>Add a category</h2></div></div><form className="category-form" onSubmit={addCategory}><label className="admin-field"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') })} required /></label><label className="admin-field"><span>Slug</span><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></label><label className="admin-field"><span>Section</span><select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}><option value="electronics">Electronics</option><option value="mobiles">Mobiles</option></select></label><button className="admin-button primary"><Icon name="plus" size={16} />Add category</button></form></section>
    <div className="category-list">{categories.map((category) => <article className={`category-row${category.is_active ? '' : ' disabled'}`} key={category.id}><div className="category-main"><span className="category-symbol"><Icon name={category.icon || 'package'} size={19} /></span><div><b>{category.name}</b><small>/{category.slug} · {human(category.section)}</small></div><label className="switch-control"><span>{category.is_active ? 'Visible' : 'Hidden'}</span><input type="checkbox" checked={!!category.is_active} onChange={() => toggle(category)} aria-label={`${category.is_active ? 'Hide' : 'Show'} ${category.name}`} /><i /></label></div>{category.sub_categories?.length > 0 && <div className="subcategory-list">{category.sub_categories.map((sub) => <span key={sub.id}>{sub.name}</span>)}</div>}<form className="subcategory-form" onSubmit={(e) => addSubcategory(e, category)}><input aria-label={`New subcategory name for ${category.name}`} placeholder="Subcategory name" value={subForms[category.id]?.name || ''} onChange={(e) => setSubForms((current) => ({ ...current, [category.id]: { name: e.target.value, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') } }))} required /><button className="admin-text-button">Add subcategory</button></form></article>)}</div>
  </>;
}

function PeopleEditor({ title, people = [], includeBio = false, onChange }) {
  return <div className="people-editor"><div className="section-title"><div><p className="admin-kicker">ABOUT PAGE</p><h3>{title}</h3></div><button type="button" className="admin-text-button" onClick={() => onChange([...people, { name: '', role: '', ...(includeBio ? { bio: '' } : {}) }])}><Icon name="plus" size={14} /> Add person</button></div>{people.map((person, index) => <div className="person-edit-row" key={`${title}-${index}`}><label className="admin-field"><span>Name</span><input value={person.name || ''} onChange={(e) => onChange(people.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} /></label><label className="admin-field"><span>Role</span><input value={person.role || ''} onChange={(e) => onChange(people.map((row, i) => i === index ? { ...row, role: e.target.value } : row))} /></label>{includeBio && <label className="admin-field full"><span>Short bio</span><textarea rows="2" value={person.bio || ''} onChange={(e) => onChange(people.map((row, i) => i === index ? { ...row, bio: e.target.value } : row))} /></label>}<button type="button" className="admin-text-button danger remove-person" onClick={() => onChange(people.filter((_, i) => i !== index))}>Remove</button></div>)}</div>;
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
  async function saveAboutAndOffer(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const result = await adminApi.updateSettings({ default_offer: settings.default_offer, about_page_content: settings.about_page_content });
      setSettings((current) => ({ ...current, ...result.settings }));
      setSuccess('Offer and About page saved');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function toggleTab(tab, enabled) {
    try { const updated = await adminApi.updateTab(tab.key, { is_enabled: enabled }); setTabs((rows) => rows.map((row) => row.key === tab.key ? updated : row)); setSuccess(`${tab.label} tab ${enabled ? 'enabled' : 'hidden'}`); }
    catch (err) { setError(err.message); }
  }
  async function saveCustomTab(event, tab) {
    event.preventDefault();
    try {
      const updated = await adminApi.updateTab(tab.key, { label: tab.label, content: tab.content });
      setTabs((rows) => rows.map((row) => row.key === tab.key ? updated : row));
      setSuccess(`${tab.label} tab saved`);
    } catch (err) { setError(err.message); }
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
    <form className="settings-layout" onSubmit={saveAboutAndOffer}>
      <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">HOME PAGE</p><h2>Default offer</h2><p className="admin-muted">Shown in the customer home page offer banner.</p></div></div><div className="settings-grid"><label className="admin-field"><span>Offer title</span><input value={settings.default_offer?.title || ''} onChange={(e) => setSettings({ ...settings, default_offer: { ...settings.default_offer, title: e.target.value } })} /></label><label className="admin-field"><span>Offer image URL</span><input type="url" value={settings.default_offer?.image_url || ''} onChange={(e) => setSettings({ ...settings, default_offer: { ...settings.default_offer, image_url: e.target.value } })} /></label><label className="admin-field full"><span>Offer text</span><textarea rows="3" value={settings.default_offer?.text || ''} onChange={(e) => setSettings({ ...settings, default_offer: { ...settings.default_offer, text: e.target.value } })} /></label><label className="admin-check"><input type="checkbox" checked={settings.default_offer?.enabled !== false} onChange={(e) => setSettings({ ...settings, default_offer: { ...settings.default_offer, enabled: e.target.checked } })} />Show this offer</label></div></section>
      <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">ABOUT PAGE</p><h2>Shop story and team</h2><p className="admin-muted">These details appear on the customer About page.</p></div></div><div className="settings-grid"><label className="admin-field full"><span>About the shop</span><textarea rows="3" value={settings.about_page_content?.about || ''} onChange={(e) => setSettings({ ...settings, about_page_content: { ...settings.about_page_content, about: e.target.value } })} /></label><label className="admin-field"><span>Our store</span><textarea rows="3" value={settings.about_page_content?.store || ''} onChange={(e) => setSettings({ ...settings, about_page_content: { ...settings.about_page_content, store: e.target.value } })} /></label><label className="admin-field"><span>Our mission</span><textarea rows="3" value={settings.about_page_content?.mission || ''} onChange={(e) => setSettings({ ...settings, about_page_content: { ...settings.about_page_content, mission: e.target.value } })} /></label><label className="admin-field full"><span>Why customers trust us (one per line)</span><textarea rows="3" value={(settings.about_page_content?.trust || []).join('\n')} onChange={(e) => setSettings({ ...settings, about_page_content: { ...settings.about_page_content, trust: e.target.value.split(/\n/).map((line) => line.trim()).filter(Boolean) } })} /></label></div><div className="people-grid"><PeopleEditor title="Owners" people={settings.about_page_content?.owners || []} includeBio onChange={(owners) => setSettings({ ...settings, about_page_content: { ...settings.about_page_content, owners } })} /><PeopleEditor title="Employees" people={settings.about_page_content?.team || []} onChange={(team) => setSettings({ ...settings, about_page_content: { ...settings.about_page_content, team } })} /></div><button className="admin-button primary" disabled={busy}>{busy ? 'Saving…' : 'Save offer and About page'}</button></section>
    </form>
    <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">PRODUCT DETAILS</p><h2>Information tabs</h2><p className="admin-muted">Built-in tabs can be hidden. Custom tab content is shared across product pages.</p></div></div><div className="tab-settings">{tabs.map((tab) => <div className="tab-setting-wrap" key={tab.key}><label className="tab-setting"><span><b>{tab.label}</b><small>{tab.is_custom ? 'Custom tab' : `Built-in · ${tab.key}`}</small></span><input type="checkbox" checked={tab.is_enabled} onChange={(e) => toggleTab(tab, e.target.checked)} aria-label={`${tab.is_enabled ? 'Hide' : 'Show'} ${tab.label} tab`} /></label>{tab.is_custom && <form className="custom-tab-edit" onSubmit={(event) => saveCustomTab(event, tab)}><label className="admin-field"><span>Tab label</span><input value={tab.label} onChange={(e) => setTabs((rows) => rows.map((row) => row.key === tab.key ? { ...row, label: e.target.value } : row))} required /></label><label className="admin-field"><span>Shared content</span><textarea rows="3" value={tab.content || ''} onChange={(e) => setTabs((rows) => rows.map((row) => row.key === tab.key ? { ...row, content: e.target.value } : row))} /></label><button className="admin-text-button">Save tab</button></form>}</div>)}</div><form className="custom-tab-form" onSubmit={addTab}><label className="admin-field"><span>New tab key</span><input value={newTab.key} onChange={(e) => setNewTab({ ...newTab, key: e.target.value })} placeholder="shipping-info" required /></label><label className="admin-field"><span>Label</span><input value={newTab.label} onChange={(e) => setNewTab({ ...newTab, label: e.target.value })} placeholder="Shipping" required /></label><label className="admin-field"><span>Content</span><input value={newTab.content} onChange={(e) => setNewTab({ ...newTab, content: e.target.value })} placeholder="Shown on product pages" /></label><button className="admin-button secondary"><Icon name="plus" size={16} />Add tab</button></form></section>
    <section className="admin-section"><div className="section-title"><div><p className="admin-kicker">WHATSAPP</p><h2>Message templates</h2><p className="admin-muted">Business sends use the approved Meta template name configured on the server.</p></div></div><form className="template-form" onSubmit={saveTemplate}><label className="admin-field"><span>Template</span><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>{templates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}</select></label>{templateDraft && <><label className="admin-field"><span>Template label</span><input value={templateDraft.label} onChange={(e) => setTemplateDraft({ ...templateDraft, label: e.target.value })} /></label><label className="admin-field"><span>Message body</span><textarea rows="9" value={templateDraft.body} onChange={(e) => setTemplateDraft({ ...templateDraft, body: e.target.value })} /></label><p className="admin-hint">Keep this body and its placeholder order aligned with the Meta-approved template. Variables such as {'{CUSTOMER_NAME}'} and {'{ORDER_ID}'} are passed in that order.</p><button className="admin-button secondary">Save template</button></>}</form></section>
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