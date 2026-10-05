import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSettings } from './SettingsContext.jsx';

const Ctx = createContext(null);
const KEY = 're_cart_v1';
const MAX_QTY = 10;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const { settings } = useSettings();
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable: cart still works for this session */
    }
  }, [items]);

  const add = useCallback((p, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.id === p.id);
      const limit = Math.min(MAX_QTY, p.stock || MAX_QTY);
      if (found) return cur.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, limit) } : i));
      return [
        ...cur,
        { id: p.id, slug: p.slug, name: p.name, price: Number(p.price), original_price: p.original_price, thumbnail_url: p.thumbnail_url, stock: p.stock, qty: Math.min(qty, limit) },
      ];
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, MAX_QTY, i.stock || MAX_QTY)) } : i)));
  }, []);
  const remove = useCallback((id) => setItems((cur) => cur.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = items.length ? Number(settings.delivery_charge) || 0 : 0; // from Admin Settings
    return { items, add, setQty, remove, clear, count, subtotal, delivery, total: subtotal + delivery };
  }, [items, settings.delivery_charge, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
