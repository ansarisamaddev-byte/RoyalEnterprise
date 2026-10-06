import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const Ctx = createContext(null);

const DEFAULTS = { store_name: 'Royal Enterprise', delivery_charge: 0, store_whatsapp: '', store_phone: '' };

export function SettingsProvider({ children }) {
  const [state, setState] = useState({ settings: DEFAULTS, tabs: [], categories: [], orderPlacedTemplate: null, loading: true, error: null });

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([api.getSettings(), api.getCategories()])
      .then(([s, c]) =>
        setState({
          settings: { ...DEFAULTS, ...s.settings },
          tabs: s.tabs,
          orderPlacedTemplate: s.orderPlacedTemplate,
          categories: c.categories,
          loading: false,
          error: null,
        })
      )
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })));
  };
  useEffect(() => {
    load();
    const refresh = () => load();
    const onStorage = (event) => {
      if (event.key === 're_store_settings_updated') load();
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('re_store_settings_updated', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('re_store_settings_updated', refresh);
    };
  }, []);

  const value = useMemo(() => ({ ...state, reload: load }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
