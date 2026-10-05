import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import OrderTimeline from '../components/OrderTimeline.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api } from '../services/api.js';
import { formatDate, formatINR, isValidMobile } from '../utils/format.js';
import { isCancelled, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../utils/status.js';
import { waLink } from '../utils/whatsapp.js';

const payPill = { PAYMENT_PENDING: 'pill-amber', PAYMENT_RECEIVED: 'pill-green', REFUNDED: 'pill-blue' };

export default function TrackOrder() {
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const [orderId, setOrderId] = useState(params.get('id') || '');
  const [mobile, setMobile] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^RE-\d{3,10}$/i.test(orderId.trim())) errs.orderId = 'Invalid Order ID (example: RE-10482)';
    if (!isValidMobile(mobile)) errs.mobile = 'Invalid mobile number';
    setErrors(errs);
    setError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    setOrder(null);
    try {
      setOrder(await api.trackOrder({ orderId: orderId.trim(), mobile }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelled = order && isCancelled(order.order_status);

  return (
    <div className="container page" style={{ maxWidth: 960 }}>
      <h1 className="page-title" style={{ marginBottom: 14 }}>Track Your Order</h1>
      <form className="card card-pad" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ alignItems: 'end' }}>
          <div className="field">
            <label htmlFor="orderId">Order ID</label>
            <input id="orderId" className={`input${errors.orderId ? ' invalid' : ''}`} value={orderId} onChange={(e) => setOrderId(e.target.value.toUpperCase())} placeholder="RE-10482" autoComplete="off" required />
            {errors.orderId && <span className="field-error" role="alert">{errors.orderId}</span>}
          </div>
          <div className="field">
            <label htmlFor="mobile">Mobile Number</label>
            <input id="mobile" className={`input${errors.mobile ? ' invalid' : ''}`} type="tel" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" autoComplete="tel" required />
            {errors.mobile && <span className="field-error" role="alert">{errors.mobile}</span>}
          </div>
          <div className="full"><button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>{busy ? 'Checking...' : 'Track Order'}</button></div>
        </div>
      </form>

      {error && <div className="alert alert-error" role="alert" style={{ marginTop: 14 }}>{error}</div>}

      {order && (
        <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
          <section className="card card-pad">
            <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontSize: 18 }}>Order #{order.order_code}</h2>
              <span className="spacer" />
              <span className={`pill ${cancelled ? 'pill-red' : 'pill-blue'}`}>{ORDER_STATUS_LABEL[order.order_status]}</span>
              <span className={`pill ${payPill[order.payment_status]}`}>{PAYMENT_STATUS_LABEL[order.payment_status]}</span>
            </div>
            <dl className="kv" style={{ margin: '0 0 18px' }}>
              <div><dt>Order ID</dt><dd>{order.order_code}</dd></div>
              <div><dt>Order Date</dt><dd>{formatDate(order.created_at, true)}</dd></div>
              <div><dt>Order Status</dt><dd>{ORDER_STATUS_LABEL[order.order_status]}</dd></div>
              <div><dt>Payment Status</dt><dd>{PAYMENT_STATUS_LABEL[order.payment_status]}</dd></div>
            </dl>
            {cancelled ? (
              <div className="alert alert-error" role="status">
                <b>{order.order_status === 'OUT_OF_STOCK' ? 'Item out of stock' : 'This order has been cancelled'}.</b>{' '}
                {order.order_status === 'OUT_OF_STOCK' ? 'Unfortunately one or more items are currently unavailable.' : ''} Please contact us if you have any questions.
              </div>
            ) : <OrderTimeline order={order} />}
          </section>

          <div style={{ display: 'grid', gap: 14 }} className="about-grid">
            <section className="card card-pad">
              <h2 style={{ fontSize: 15, marginBottom: 6 }}>Order Items</h2>
              {order.items.map((i, n) => (
                <div className="mini-item" key={n}>
                  <ProductImage src={i.thumbnail_url} alt="" />
                  <div><div style={{ fontWeight: 600 }}>{i.name}</div><div className="muted" style={{ fontSize: 12 }}>Qty {i.quantity} × {formatINR(i.unit_price)}</div></div>
                  <b>{formatINR(i.line_total)}</b>
                </div>
              ))}
              <div className="sum-row"><span className="muted">Delivery</span><span>{order.delivery_charge > 0 ? formatINR(order.delivery_charge) : 'Free'}</span></div>
              <div className="sum-row total"><span>Total</span><span>{formatINR(order.total)}</span></div>
            </section>
            <section className="card card-pad">
              <h2 style={{ fontSize: 15, marginBottom: 8 }}>Customer &amp; Delivery</h2>
              <p><b>{order.customer_name}</b></p>
              <p className="muted">+91 {order.mobile}</p>
              <h3 style={{ fontSize: 13, margin: '14px 0 4px' }}>Delivery Address</h3>
              <p>{order.address}, {order.area}<br />{order.city} - {order.pincode}</p>
              {order.note && <p className="muted" style={{ marginTop: 10 }}>Note: {order.note}</p>}
              <h3 style={{ fontSize: 13, margin: '16px 0 8px' }}>Need Help?</h3>
              {settings.store_whatsapp && (
                <a className="btn btn-green-solid btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(settings.store_whatsapp, `Hello ${settings.store_name}, I need help with order ${order.order_code}.`)}>
                  <Icon name="whatsapp" size={16} />Chat on WhatsApp
                </a>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
