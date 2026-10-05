import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { discountPct, formatINR } from '../utils/format.js';

export function StockLabel({ stock }) {
  if (stock <= 0) return <span className="stock out">Out of Stock</span>;
  if (stock <= 5) return <span className="stock low">Only {stock} left</span>;
  return <span className="stock in">In Stock</span>;
}

export default function ProductCard({ product: p }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const pct = discountPct(p);
  const out = p.stock <= 0;

  const onAdd = () => {
    add(p, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="pcard">
      <Link to={`/product/${p.slug}`} className="pcard-img" aria-label={p.name}>
        <ProductImage src={p.thumbnail_url} alt={p.name} />
        <span className="pcard-badges">
          {pct > 0 && <span className="badge badge-red">{pct}% OFF</span>}
          {p.badge && <span className="badge badge-navy">{p.badge}</span>}
        </span>
      </Link>
      <div className="pcard-body">
        <Link to={`/product/${p.slug}`} className="pcard-name">{p.name}</Link>
        <div className="price-row">
          <span className="price">{formatINR(p.price)}</span>
          {pct > 0 && p.original_price && <span className="old-price">{formatINR(p.original_price)}</span>}
        </div>
        <StockLabel stock={p.stock} />
        <button className={`btn btn-sm ${added ? 'btn-green' : 'btn-primary'}`} onClick={onAdd} disabled={out} aria-live="polite">
          {out ? 'Unavailable' : added ? 'Added to cart' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}
