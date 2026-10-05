export const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export function discountPct(p) {
  if (p.discount > 0) return p.discount;
  if (p.original_price && Number(p.original_price) > Number(p.price)) {
    return Math.round((1 - Number(p.price) / Number(p.original_price)) * 100);
  }
  return 0;
}

export const formatDate = (iso, withTime = false) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export const isValidMobile = (v) => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g, '').slice(-10)) && String(v).replace(/\D/g, '').length >= 10;
