import { useState } from 'react';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><rect x="70" y="40" width="60" height="120" rx="10" fill="none" stroke="#9ca3af" stroke-width="5"/><circle cx="100" cy="144" r="4" fill="#9ca3af"/></svg>'
  );

export default function ProductImage({ src, alt, ...rest }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed || !src ? FALLBACK : src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} {...rest} />;
}
