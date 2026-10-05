import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb.jsx';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];
const TITLES = { mobiles: 'Mobiles', electronics: 'Electronics', all: 'Search Results' };

const toggleCsv = (csv, v) => {
  const set = new Set(csv ? csv.split(',') : []);
  set.has(v) ? set.delete(v) : set.add(v);
  return [...set].join(',');
};

function CheckList({ title, options, selected, onToggle }) {
  if (!options?.length) return null;
  const sel = selected ? selected.split(',') : [];
  return (
    <div className="filter-group">
      <h4>{title}</h4>
      <div className="filter-options">
        {options.map((o) => (
          <label key={o} className="checkbox"><input type="checkbox" checked={sel.includes(o)} onChange={() => onToggle(o)} />{o}</label>
        ))}
      </div>
    </div>
  );
}

function FilterPanel({ params, setParam, facets, categories, section, clear }) {
  const [min, setMin] = useState(params.get('min') || '');
  const [max, setMax] = useState(params.get('max') || '');
  const applyPrice = (e) => {
    e.preventDefault();
    setParam({ min, max });
  };
  const cats = categories.filter((c) => section === 'all' || c.section === section);
  return (
    <div>
      {section !== 'mobiles' && cats.length > 0 && (
        <div className="filter-group">
          <h4>Category</h4>
          <div className="filter-options">
            <label className="checkbox"><input type="radio" name="cat" checked={!params.get('category')} onChange={() => setParam({ category: '' })} />All</label>
            {cats.map((c) => (
              <label key={c.id} className="checkbox"><input type="radio" name="cat" checked={params.get('category') === c.slug} onChange={() => setParam({ category: c.slug })} />{c.name}</label>
            ))}
          </div>
        </div>
      )}
      <CheckList title="Brand" options={facets?.brands} selected={params.get('brand')} onToggle={(v) => setParam({ brand: toggleCsv(params.get('brand'), v) })} />
      <form className="filter-group" onSubmit={applyPrice}>
        <h4>Price Range</h4>
        <div className="price-inputs">
          <label className="sr-only" htmlFor="pmin">Minimum price</label>
          <input id="pmin" className="input" inputMode="numeric" placeholder={facets ? String(Math.floor(facets.priceMin)) : 'Min'} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} />
          <span>–</span>
          <label className="sr-only" htmlFor="pmax">Maximum price</label>
          <input id="pmax" className="input" inputMode="numeric" placeholder={facets ? String(Math.ceil(facets.priceMax)) : 'Max'} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} type="submit">Apply</button>
      </form>
      <div className="filter-group">
        <h4>Availability</h4>
        <label className="checkbox"><input type="checkbox" checked={params.get('inStock') === '1'} onChange={(e) => setParam({ inStock: e.target.checked ? '1' : '' })} />In Stock only</label>
      </div>
      <CheckList title="RAM" options={facets?.ram} selected={params.get('ram')} onToggle={(v) => setParam({ ram: toggleCsv(params.get('ram'), v) })} />
      <CheckList title="Storage" options={facets?.storage} selected={params.get('storage')} onToggle={(v) => setParam({ storage: toggleCsv(params.get('storage'), v) })} />
      <button className="btn btn-outline btn-sm btn-block" style={{ margin: '8px 0 14px' }} onClick={() => { setMin(''); setMax(''); clear(); }}>Clear all filters</button>
    </div>
  );
}

export default function Listing({ section }) {
  const [params, setParams] = useSearchParams();
  const { categories } = useSettings();
  const [drawer, setDrawer] = useState(false);
  const key = params.toString();

  const query = useMemo(() => Object.fromEntries(params.entries()), [key]);
  const { data, loading, error, retry } = useAsync(() => api.getProducts({ ...query, section }), [key, section]);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  const clear = () => setParams(params.get('q') ? { q: params.get('q') } : {}, { replace: true });

  const title = section === 'all' && params.get('q') ? `Results for "${params.get('q')}"` : TITLES[section];
  const panel = <FilterPanel key={key} params={params} setParam={setParam} facets={data?.facets} categories={categories} section={section} clear={clear} />;

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: TITLES[section] }]} />
      <div className="list-head">
        <div>
          <h1 className="page-title">{title}</h1>
          {data && <p className="muted" style={{ marginTop: 2 }}>{data.total} {data.total === 1 ? 'Product' : 'Products'}</p>}
        </div>
        <div className="list-tools">
          <button className="btn btn-outline btn-sm filter-btn" onClick={() => setDrawer(true)}><Icon name="filter" size={16} />Filter</button>
          <label htmlFor="sort" className="muted" style={{ fontSize: 13 }}>Sort by:</label>
          <select id="sort" className="select" value={params.get('sort') || 'featured'} onChange={(e) => setParam({ sort: e.target.value === 'featured' ? '' : e.target.value })}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="list-layout">
        <aside className="filters card" aria-label="Filters">
          <h2 style={{ fontSize: 15, padding: '14px 0 0' }}>Filters</h2>
          {panel}
        </aside>
        <section aria-live="polite">
          {loading && <Loading text="Loading products..." />}
          {error && <ErrorState message={error} onRetry={retry} />}
          {data && data.products.length === 0 && (
            <EmptyState icon="search" title="No products found" text="Try changing or clearing your filters." />
          )}
          {data && data.products.length > 0 && (
            <div className="product-grid">{data.products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
        </section>
      </div>

      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="drawer-head">Filters <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close filters"><Icon name="x" /></button></div>
            <div className="drawer-body">{panel}</div>
            <div className="drawer-foot">
              <button className="btn btn-primary" onClick={() => setDrawer(false)}>Show {data ? data.total : ''} results</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
