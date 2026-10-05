import { Link, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { formatDate, formatINR } from '../utils/format.js';
import { PAYMENT_STATUS_LABEL } from '../utils/status.js';
import { buildOrderMessage, waLink } from '../utils/whatsapp.js';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t');
  const { settings, orderPlacedTemplate } = useSettings();
  const { data: o, loading, error, retry } = useAsync(() => api.getOrder(orderId, token), [orderId, token]);

  if (loading) return <div className="container page"><Loading text="Loading order..." /></div>;
  if (error) return (
    <div className="container page">
      <ErrorState title="Order not found" message="We couldn't open this confirmation. If you placed an order, use Track Order with your Order ID and mobile number." onRetry={retry} />
      <p style={{ textAlign: 'center' }}><Link to="/track-order" className="btn btn-primary">Track My Order</Link></p>
    </div>
  );

  const message = buildOrderMessage(o, orderPlacedTemplate);
  const toMe = waLink(o.whatsapp || o.mobile, message);
  const toStore = waLink(settings.store_whatsapp, `Hello ${settings.store_name}, I just placed order ${o.order_code} (${formatINR(o.total)}). Please confirm.`);

  return (
    <div className="container page success-wrap">
      <div className="card card-pad" style={{ textAlign: 'center' }}>
        <div className="success-icon"><Icon name="check" size={34} strokeWidth={3} /></div>
        <h1 style={{ fontSize: 22 }}>Order Placed Successfully! 🎉</h1>
        <p className="muted" style={{ marginTop: 4 }}>Your order has been received.</p>
        <p style={{ marginTop: 8, fontSize: 16 }}>Order ID: <b>{o.order_code}</b></p>
      </div>

      <div className="card card-pad" style={{ marginTop: 14 }}>
        <dl className="kv" style={{ margin: 0 }}>
          <div><dt>Order ID</dt><dd>{o.order_code}</dd></div>
          <div><dt>Order Date</dt><dd>{formatDate(o.created_at, true)}</dd></div>
          <div><dt>Total Amount</dt><dd>{formatINR(o.total)}</dd></div>
          <div><dt>Customer</dt><dd>{o.customer_name}</dd></div>
          <div><dt>WhatsApp</dt><dd>+91 {o.whatsapp}</dd></div>
        </dl>
      </div>

      <div className="card card-pad" style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: 15, marginBottom: 6 }}>Ordered Items</h2>
        {o.items.map((i, n) => (
          <div className="mini-item" key={n}>
            <ProductImage src={i.thumbnail_url} alt="" />
            <div><div style={{ fontWeight: 600 }}>{i.name}</div><div className="muted" style={{ fontSize: 12 }}>Qty {i.quantity}</div></div>
            <b>{formatINR(i.line_total)}</b>
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <div className="sum-row"><span className="muted">Subtotal</span><span>{formatINR(o.subtotal)}</span></div>
          <div className="sum-row"><span className="muted">Delivery</span>{o.delivery_charge > 0 ? <span>{formatINR(o.delivery_charge)}</span> : <span className="free">Free</span>}</div>
          <div className="sum-row total"><span>Total</span><span>{formatINR(o.total)}</span></div>
        </div>
      </div>

      <div className="alert alert-note" style={{ marginTop: 14 }}>
        <b>Payment Status: {PAYMENT_STATUS_LABEL[o.payment_status]}</b><br />
        Our team will contact you shortly to confirm payment and delivery.
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <a className="btn btn-green-solid btn-lg" href={toMe} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} />Save confirmation on WhatsApp</a>
        {settings.store_whatsapp && <a className="btn btn-green" href={toStore} target="_blank" rel="noopener noreferrer">Chat with {settings.store_name}</a>}
        <Link className="btn btn-primary btn-lg" to={`/track-order?id=${o.order_code}`}>Track My Order</Link>
        <Link className="btn btn-outline" to="/">Continue Shopping</Link>
      </div>
    </div>
  );
}
