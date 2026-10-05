import { Link } from 'react-router-dom';
import HeroArt from '../components/HeroArt.jsx';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

const TRUST = [
  { icon: 'pin', label: 'Serving You Nearby' },
  { icon: 'shield', label: 'Genuine Products' },
  { icon: 'tag', label: 'Best Prices' },
  { icon: 'headset', label: 'Local Support' },
  { icon: 'whatsapp', label: 'WhatsApp Assistance' },
];

export default function Home() {
  const { categories, settings } = useSettings();
  const { data, loading, error, retry } = useAsync(() => api.getProducts({ featured: '1', limit: 8 }), []);
  const offer = settings.default_offer;

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <h1>Your Trusted<br />Mobile &amp; Electronics<br />Store</h1>
            <p>Genuine Products • Best Prices • Local Support</p>
            <div className="hero-actions">
              <Link to="/mobiles" className="btn btn-gold btn-lg">Shop Now</Link>
              <a href="#categories" className="btn btn-ghost-light btn-lg">Browse Categories</a>
            </div>
          </div>
          <div className="hero-art"><HeroArt /></div>
        </div>
      </section>

      <section className="trust" aria-label="Why shop with us">
        <div className="container trust-grid">
          {TRUST.map((t) => (
            <div className="trust-item" key={t.label}><Icon name={t.icon} size={22} />{t.label}</div>
          ))}
        </div>
      </section>

      <div className="container">
        <section className="section" id="categories">
          <div className="section-head"><h2>Shop by Category</h2></div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.id} to={`/${c.section}?category=${c.slug}`} className="cat-card">
                <span className="icon-wrap"><Icon name={c.icon || 'package'} size={22} /></span>
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        {offer?.enabled && offer.text && (
          <div className="offer-banner" role="note">
            {offer.image_url && <ProductImage src={offer.image_url} alt="" />}
            <p><b>{offer.title}: </b>{offer.text}</p>
          </div>
        )}

        <section className="section">
          <div className="section-head">
            <h2>Popular Products</h2>
            <Link to="/mobiles" className="link">View all</Link>
          </div>
          {loading && <Loading text="Loading products..." />}
          {error && <ErrorState message={error} onRetry={retry} />}
          {data && data.products.length === 0 && <EmptyState title="No products found" text="Products will appear here soon." />}
          {data && data.products.length > 0 && (
            <div className="product-grid cols-home">
              {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
