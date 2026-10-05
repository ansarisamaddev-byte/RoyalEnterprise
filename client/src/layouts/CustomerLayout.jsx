import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { Loading } from '../components/States.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

const NAV = [
  { to: '/', label: 'For You', end: true },
  { to: '/mobiles', label: 'Mobiles' },
  { to: '/electronics', label: 'Electronics' },
  { to: '/about', label: 'About' },
  { to: '/track-order', label: 'Track Order' },
];

function SearchBox({ className, mobile = false, onDone }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
    onDone?.();
  };
  return (
    <form className={className} onSubmit={submit} role="search">
      <label htmlFor={mobile ? 'search-m' : 'search-d'} className="sr-only">Search products</label>
      <Icon name="search" size={18} />
      <input id={mobile ? 'search-m' : 'search-d'} className="input" type="search" placeholder="Search mobiles, TVs, accessories..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus={mobile} />
    </form>
  );
}

function Header() {
  const { count } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container">
        <div className="header-main">
          <Logo />
          <SearchBox className="search-form" />
          <span className="spacer" />
          <Link to="/track-order" className="track-link">Track Order</Link>
          <button className="icon-btn search-toggle" onClick={() => setSearchOpen((o) => !o)} aria-label="Search" aria-expanded={searchOpen}><Icon name="search" /></button>
          <Link to="/cart" className="icon-btn" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
            <Icon name="cart" />
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </div>
        {searchOpen && <SearchBox className="mobile-search" mobile onDone={() => setSearchOpen(false)} />}
      </div>
      <nav className="main-nav" aria-label="Main">
        <div className="container">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>{n.label}</NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

function BottomNav() {
  const { count } = useCart();
  const items = [
    { to: '/', label: 'Home', icon: 'home', end: true },
    { to: '/mobiles', label: 'Mobiles', icon: 'phone' },
    { to: '/electronics', label: 'Electronics', icon: 'tv' },
    { to: '/cart', label: 'Cart', icon: 'cart' },
    { to: '/track-order', label: 'Track', icon: 'track' },
  ];
  return (
    <nav className="bottom-nav" aria-label="Mobile">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={i.icon} size={21} />
          {i.label}
          {i.to === '/cart' && count > 0 && <span className="cart-count">{count}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function Footer() {
  const { settings: s } = useSettings();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo light />
          <p style={{ marginTop: 10, maxWidth: 300 }}>Genuine products, best prices and friendly local support.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <div className="footer-links">
            <Link to="/mobiles">Mobiles</Link>
            <Link to="/electronics">Electronics</Link>
            <Link to="/about">About Us</Link>
            <Link to="/track-order">Track Order</Link>
          </div>
        </div>
        <div>
          <h4>Visit / Contact</h4>
          <div className="footer-links">
            {s.store_address && <span>{s.store_address}</span>}
            {s.store_phone && <span>Phone: {s.store_phone}</span>}
            {s.business_hours && <span>{s.business_hours}</span>}
          </div>
        </div>
      </div>
      <div className="footer-bottom"><div className="container">© {new Date().getFullYear()} {s.store_name}. All rights reserved.</div></div>
    </footer>
  );
}

export default function CustomerLayout() {
  const { pathname } = useLocation();
  const { error, reload } = useSettings();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return (
    <>
      <Header />
      {error && (
        <div className="api-banner" role="alert">
          Couldn't reach the store server. <button className="link" style={{ background: 'none', border: 0 }} onClick={reload}>Retry</button>
        </div>
      )}
      <main>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
