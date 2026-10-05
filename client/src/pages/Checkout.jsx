import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';
import { formatINR, isValidMobile } from '../utils/format.js';
import { Summary } from './Cart.jsx';

const EMPTY = { fullName: '', mobile: '', whatsapp: '', email: '', address: '', area: '', city: '', pincode: '', note: '' };

function check(f, sameWa) {
  const e = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Please enter your full name';
  if (!isValidMobile(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
  if (!sameWa && !isValidMobile(f.whatsapp)) e.whatsapp = 'Enter a valid 10-digit WhatsApp number';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address';
  if (f.address.trim().length < 5) e.address = 'Please enter your full address';
  if (!f.area.trim()) e.area = 'Please enter your area / locality';
  if (!f.city.trim()) e.city = 'Please enter your city';
  if (!/^\d{6}$/.test(f.pincode.trim())) e.pincode = 'Enter a valid 6-digit PIN code';
  return e;
}

function Field({ id, label, error, optional, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{optional && <span className="muted"> (optional)</span>}</label>
      {children}
      {error && <span className="field-error" id={`${id}-err`} role="alert">{error}</span>}
    </div>
  );
}

export default function Checkout() {
  const { items, subtotal, delivery, total, clear } = useCart();
  const nav = useNavigate();
  const [f, setF] = useState(EMPTY);
  const [sameWa, setSameWa] = useState(true);
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [formError, setFormError] = useState('');

  if (!items.length && !placing) return <Navigate to="/cart" replace />;

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const props = (k) => ({ id: k, value: f[k], onChange: set(k), className: `input${errors[k] ? ' invalid' : ''}`, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined });

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const errs = check(f, sameWa);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setPlacing(true);
    try {
      const order = await api.createOrder({
        ...f,
        whatsapp: sameWa ? f.mobile : f.whatsapp,
        items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
      });
      clear();
      nav(`/order-success/${order.order_code}?t=${order.access_token}`, { replace: true });
    } catch (err) {
      setPlacing(false);
      if (err.fields) setErrors(err.fields);
      setFormError(err.status === 409 || err.status === 400 ? err.message : `Failed to place order. ${err.message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="container page">
      <h1 className="page-title" style={{ marginBottom: 14 }}>Checkout</h1>
      {formError && <div className="alert alert-error" role="alert" style={{ marginBottom: 14 }}>{formError}</div>}
      <form className="checkout-layout" onSubmit={submit} noValidate>
        <section className="card card-pad" aria-label="Customer details">
          <h2 style={{ fontSize: 16, marginBottom: 14 }}>Customer Details</h2>
          <div className="form-grid">
            <Field id="fullName" label="Full Name" error={errors.fullName}><input {...props('fullName')} autoComplete="name" placeholder="e.g. Rahul Kumar" /></Field>
            <Field id="mobile" label="Mobile Number" error={errors.mobile}><input {...props('mobile')} type="tel" inputMode="numeric" autoComplete="tel" placeholder="98765 43210" /></Field>
            <Field id="whatsapp" label="WhatsApp Number" error={errors.whatsapp}>
              <input {...props('whatsapp')} type="tel" inputMode="numeric" disabled={sameWa} value={sameWa ? f.mobile : f.whatsapp} placeholder="98765 43210" />
              <label className="checkbox"><input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} />Same as mobile number</label>
            </Field>
            <Field id="email" label="Email" optional error={errors.email}><input {...props('email')} type="email" autoComplete="email" placeholder="you@example.com" /></Field>
            <div className="full"><Field id="address" label="Address" error={errors.address}><input {...props('address')} autoComplete="street-address" placeholder="House no., street, landmark" /></Field></div>
            <Field id="area" label="Area / Locality" error={errors.area}><input {...props('area')} /></Field>
            <Field id="city" label="City" error={errors.city}><input {...props('city')} autoComplete="address-level2" /></Field>
            <Field id="pincode" label="PIN Code" error={errors.pincode}><input {...props('pincode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" /></Field>
            <div className="full">
              <Field id="note" label="Order Note" optional>
                <textarea id="note" className="textarea" value={f.note} onChange={set('note')} maxLength={500} placeholder="Any special instructions for the order?" />
              </Field>
            </div>
          </div>
        </section>

        <aside className="card card-pad summary" aria-label="Your order">
          <h3>Your Order</h3>
          {items.map((i) => (
            <div className="mini-item" key={i.id}>
              <ProductImage src={i.thumbnail_url} alt="" />
              <div><div style={{ fontWeight: 600 }}>{i.name}</div><div className="muted" style={{ fontSize: 12 }}>Qty {i.qty}</div></div>
              <b>{formatINR(i.price * i.qty)}</b>
            </div>
          ))}
          <div style={{ marginTop: 8 }}><Summary subtotal={subtotal} delivery={delivery} total={total} /></div>
          <div className="alert alert-note" style={{ margin: '12px 0' }}>
            <Icon name="whatsapp" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />No online payment now. After you place the order, our team will contact you on WhatsApp to confirm payment and delivery.
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={placing}>{placing ? 'Placing order...' : `Place Order · ${formatINR(total)}`}</button>
        </aside>
      </form>
    </div>
  );
}
