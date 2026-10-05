import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import Qty from '../components/Qty.jsx';
import { EmptyState } from '../components/States.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatINR } from '../utils/format.js';

export function Summary({ subtotal, delivery, total }) {
  return (
    <>
      <div className="sum-row"><span className="muted">Subtotal</span><span>{formatINR(subtotal)}</span></div>
      <div className="sum-row"><span className="muted">Delivery</span>{delivery > 0 ? <span>{formatINR(delivery)}</span> : <span className="free">Free</span>}</div>
      <div className="sum-row total"><span>Total</span><span>{formatINR(total)}</span></div>
    </>
  );
}

export default function Cart() {
  const { items, setQty, remove, subtotal, delivery, total, count } = useCart();
  const nav = useNavigate();

  if (!items.length) {
    return <div className="container page"><div className="card"><EmptyState icon="cart" title="Your cart is empty" text="Looks like you haven't added anything yet." actionLabel="Continue Shopping" actionTo="/mobiles" /></div></div>;
  }

  return (
    <div className="container page">
      <h1 className="page-title" style={{ marginBottom: 14 }}>Shopping Cart <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>({count} {count === 1 ? 'item' : 'items'})</span></h1>
      <div className="cart-layout">
        <section className="card card-pad" aria-label="Cart items">
          <div className="cart-head" aria-hidden="true"><span>Product</span><span>Price</span><span>Quantity</span><span>Total</span><span /></div>
          {items.map((i) => (
            <div className="cart-row" key={i.id}>
              <div className="prod">
                <Link to={`/product/${i.slug}`} className="cart-thumb"><ProductImage src={i.thumbnail_url} alt="" /></Link>
                <Link to={`/product/${i.slug}`} className="cart-name">{i.name}</Link>
              </div>
              <div className="cart-meta">
                <span className="row-price">{formatINR(i.price)}</span>
                <Qty small value={i.qty} onChange={(v) => setQty(i.id, v)} max={Math.min(10, i.stock || 10)} label={`Quantity for ${i.name}`} />
                <span className="row-total">{formatINR(i.price * i.qty)}</span>
                <button className="remove-btn" onClick={() => remove(i.id)} aria-label={`Remove ${i.name}`}><Icon name="trash" size={16} /><span className="sr-only">Remove</span></button>
              </div>
            </div>
          ))}
        </section>
        <aside className="card card-pad summary" aria-label="Order summary">
          <h3>Order Summary</h3>
          <Summary subtotal={subtotal} delivery={delivery} total={total} />
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} onClick={() => nav('/checkout')}>Proceed to Checkout</button>
          <Link to="/mobiles" className="btn btn-outline btn-block" style={{ marginTop: 8 }}>Continue Shopping</Link>
          <p className="secure-note"><Icon name="lock" size={14} />Secure &amp; easy ordering — pay after we confirm</p>
        </aside>
      </div>
    </div>
  );
}
