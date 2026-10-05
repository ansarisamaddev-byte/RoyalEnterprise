import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { StockLabel } from '../components/ProductCard.jsx';
import Qty from '../components/Qty.jsx';
import Stars from '../components/Stars.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { discountPct, formatDate, formatINR } from '../utils/format.js';
import { waLink } from '../utils/whatsapp.js';

function TabPanel({ tab, product, defaultOffer }) {
  switch (tab.key) {
    case 'specifications':
      return product.specifications.length ? (
        <table className="spec-table"><tbody>
          {product.specifications.map((s) => <tr key={s.id}><th scope="row">{s.spec_key}</th><td>{s.spec_value}</td></tr>)}
        </tbody></table>
      ) : <EmptyState title="No specifications available" />;
    case 'reviews':
      return product.reviews.length ? product.reviews.map((r) => (
        <div className="review" key={r.id}>
          <div className="row"><Stars value={r.rating} /><b>{r.customer_name}</b><span className="muted" style={{ fontSize: 12 }}>{formatDate(r.review_date)}</span></div>
          {r.review && <p style={{ marginTop: 4 }}>{r.review}</p>}
        </div>
      )) : <EmptyState title="No reviews available" text="Be the first to ask us about this product on WhatsApp." />;
    case 'offers': {
      const list = product.offers.length ? product.offers : defaultOffer?.enabled && defaultOffer.text ? [{ id: 'default', title: defaultOffer.title, description: defaultOffer.text, image_url: defaultOffer.image_url }] : [];
      return list.length ? list.map((o) => (
        <div className="offer-item" key={o.id}>
          {o.image_url && <ProductImage src={o.image_url} alt={o.title} />}
          <div><b>{o.title}</b>{o.discount_text && <> <span className="badge badge-gold">{o.discount_text}</span></>}<p style={{ marginTop: 4 }}>{o.description}</p></div>
        </div>
      )) : <EmptyState title="No offers available" />;
    }
    case 'warranty':
      return product.warranties.length ? product.warranties.map((w) => (
        <div className="review" key={w.id}><b>{w.title}</b>{w.duration && <span className="badge badge-green" style={{ marginLeft: 8 }}>{w.duration}</span>}<p style={{ marginTop: 4 }}>{w.description}</p></div>
      )) : <EmptyState title="No warranty information available" />;
    default:
      return tab.content ? <p style={{ whiteSpace: 'pre-line' }}>{tab.content}</p> : <EmptyState title="Nothing to show yet" />;
  }
}

export default function ProductDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { settings, tabs } = useSettings();
  const { add } = useCart();
  const { data: p, loading, error, retry } = useAsync(() => api.getProduct(id), [id]);
  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => { setIdx(0); setQty(1); setActiveTab(null); }, [id]);

  if (loading) return <div className="container page"><Loading text="Loading product..." /></div>;
  if (error) return <div className="container page"><ErrorState title="Product unavailable" message={error} onRetry={retry} /></div>;

  const images = [...new Set([p.thumbnail_url, ...(p.image_urls || [])].filter(Boolean))];
  const pct = discountPct(p);
  const out = p.stock <= 0;
  const maxQty = Math.min(10, p.stock || 10);
  const highlights = p.highlights?.length ? p.highlights : p.specifications.slice(0, 6).map((s) => `${s.spec_key}: ${s.spec_value}`);
  const current = tabs.find((t) => t.key === activeTab) || tabs[0];
  const step = (d) => setIdx((i) => (i + d + images.length) % images.length);

  const addToCart = () => { add(p, qty); setAdded(true); setTimeout(() => setAdded(false), 1500); };
  const buyNow = () => { add(p, qty); nav('/checkout'); };
  const ask = waLink(settings.store_whatsapp, `Hi ${settings.store_name}, I'd like to know more about ${p.name} (${formatINR(p.price)}).\n${window.location.href}`);

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: p.category?.name || 'Products', to: `/${p.category?.section || 'electronics'}${p.category ? `?category=${p.category.slug}` : ''}` }, { label: p.name }]} />
      <div className="pd card card-pad">
        <div className="gallery">
          <div className="gallery-main">
            <ProductImage src={images[idx]} alt={`${p.name} — image ${idx + 1} of ${images.length || 1}`} loading="eager" />
            {images.length > 1 && (<>
              <button className="gallery-nav prev" onClick={() => step(-1)} aria-label="Previous image"><Icon name="left" size={18} /></button>
              <button className="gallery-nav next" onClick={() => step(1)} aria-label="Next image"><Icon name="right" size={18} /></button>
            </>)}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <button key={src} className={`thumb${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} aria-label={`Show image ${i + 1}`} aria-current={i === idx}><ProductImage src={src} alt="" /></button>
              ))}
            </div>
          )}
        </div>

        <div className="pd-info">
          <h1>{p.name}</h1>
          <div className="rating-row">
            {p.review_count > 0 ? (<><Stars value={p.rating_avg} /><b style={{ color: 'var(--ink)' }}>{p.rating_avg}</b><span>({p.review_count} {p.review_count === 1 ? 'review' : 'reviews'})</span></>) : <span>No reviews yet</span>}
          </div>
          <div className="pd-price">
            <span className="price">{formatINR(p.price)}</span>
            {pct > 0 && p.original_price && <span className="old-price" style={{ fontSize: 15 }}>{formatINR(p.original_price)}</span>}
            {pct > 0 && <span className="badge badge-green">{pct}% OFF</span>}
          </div>
          <StockLabel stock={p.stock} />
          {highlights.length > 0 && (<>
            <h2 style={{ fontSize: 14, marginTop: 14 }}>Key Highlights</h2>
            <ul className="highlights">{highlights.map((h) => <li key={h}><Icon name="check" size={15} />{h}</li>)}</ul>
          </>)}
          <div className="buy-row">
            <Qty value={qty} onChange={(v) => setQty(Math.max(1, Math.min(v, maxQty)))} max={maxQty} />
            <button className={`btn ${added ? 'btn-green' : 'btn-outline'}`} onClick={addToCart} disabled={out}>{out ? 'Out of Stock' : added ? 'Added ✓' : 'Add to Cart'}</button>
            <button className="btn btn-primary" onClick={buyNow} disabled={out}>Buy Now</button>
            {settings.store_whatsapp && <a className="btn btn-green wa" href={ask} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} />Ask on WhatsApp</a>}
          </div>
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <div className="tabs" role="tablist" aria-label="Product information">
            {tabs.map((t) => (
              <button key={t.key} role="tab" id={`tab-${t.key}`} aria-selected={current?.key === t.key} aria-controls="tab-panel" className="tab" onClick={() => setActiveTab(t.key)}>
                {t.label}{t.key === 'reviews' && p.review_count > 0 ? ` (${p.review_count})` : ''}
              </button>
            ))}
          </div>
          <div className="tab-panel" role="tabpanel" id="tab-panel" aria-labelledby={`tab-${current?.key}`}>
            {current && <TabPanel tab={current} product={p} defaultOffer={settings.default_offer} />}
          </div>
        </div>
      )}
      {p.description && <div className="card card-pad prose-card" style={{ marginTop: 16 }}><h2>About this product</h2><p>{p.description}</p></div>}
    </div>
  );
}
