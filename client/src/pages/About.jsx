import Breadcrumb from '../components/Breadcrumb.jsx';
import Icon from '../components/Icon.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

const initials = (n = '') => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function About() {
  const { settings: s } = useSettings();
  const a = s.about_page_content || {};
  const c = a.contact || {};

  return (
    <div className="container page" style={{ maxWidth: 960 }}>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
      <h1 className="page-title" style={{ marginBottom: 14 }}>About {s.store_name}</h1>

      <section className="card card-pad prose-card"><h2>About {s.store_name}</h2><p>{a.about}</p></section>
      <div className="about-grid">
        <section className="card card-pad prose-card"><h2>Our Store</h2><p>{a.store}</p></section>
        <section className="card card-pad prose-card"><h2>Our Mission</h2><p>{a.mission}</p></section>
      </div>

      {a.trust?.length > 0 && (
        <section className="card card-pad prose-card" style={{ marginTop: 14 }}>
          <h2>Why Customers Trust Us</h2>
          <ul className="highlights" style={{ border: 0, padding: 0, margin: 0 }}>
            {a.trust.map((t) => <li key={t}><Icon name="check" size={15} />{t}</li>)}
          </ul>
        </section>
      )}

      <div className="about-grid">
        {a.owners?.length > 0 && (
          <section className="card card-pad prose-card"><h2>Owners</h2>
            {a.owners.map((p, i) => (
              <div className="person" key={i}><span className="avatar">{initials(p.name)}</span><div><b>{p.name}</b><div className="muted">{p.role}</div>{p.bio && <p style={{ fontSize: 13 }}>{p.bio}</p>}</div></div>
            ))}
          </section>
        )}
        {a.team?.length > 0 && (
          <section className="card card-pad prose-card"><h2>Our Team</h2>
            {a.team.map((p, i) => (
              <div className="person" key={i}><span className="avatar">{initials(p.name)}</span><div><b>{p.name}</b><div className="muted">{p.role}</div></div></div>
            ))}
          </section>
        )}
      </div>

      <section className="card card-pad prose-card" style={{ marginTop: 14 }}>
        <h2>Local Support &amp; Contact</h2>
        <p>Questions about a product or an order? Walk in, call or message us on WhatsApp — we're happy to help.</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {s.store_address && <div className="row"><Icon name="pin" size={18} />{s.store_address}</div>}
          {(c.phone || s.store_phone) && <div className="row"><Icon name="phone" size={18} />{c.phone || s.store_phone}</div>}
          {c.email && <div className="row"><Icon name="mail" size={18} />{c.email}</div>}
          {s.business_hours && <div className="row"><Icon name="clock" size={18} />{s.business_hours}</div>}
        </div>
        {s.store_whatsapp && (
          <a className="btn btn-green-solid" style={{ marginTop: 14 }} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${s.store_whatsapp.replace(/\D/g, '')}`}>
            <Icon name="whatsapp" size={18} />Chat on WhatsApp
          </a>
        )}
      </section>
    </div>
  );
}
