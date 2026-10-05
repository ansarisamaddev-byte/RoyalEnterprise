// Simple vector product visual for the hero banner (no external image needed).
export default function HeroArt() {
  return (
    <svg viewBox="0 0 520 300" role="img" aria-label="Smartphones, earbuds and a smartwatch">
      <defs>
        <linearGradient id="scr1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#36d6c3" /><stop offset=".5" stopColor="#6b5bd6" /><stop offset="1" stopColor="#e45ca8" /></linearGradient>
        <linearGradient id="scr2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb347" /><stop offset="1" stopColor="#ff5e62" /></linearGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#4aa3ff" stopOpacity=".35" /><stop offset="1" stopColor="#4aa3ff" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="270" cy="150" rx="250" ry="140" fill="url(#glow)" />
      <ellipse cx="270" cy="276" rx="190" ry="10" fill="#000" opacity=".25" />
      <g transform="rotate(-8 190 150)"><rect x="130" y="40" width="120" height="226" rx="18" fill="#0a0e18" stroke="#2c3550" strokeWidth="3" /><rect x="138" y="48" width="104" height="210" rx="12" fill="url(#scr1)" /><rect x="172" y="53" width="36" height="7" rx="3.5" fill="#0a0e18" /></g>
      <g transform="rotate(7 330 150)"><rect x="270" y="28" width="124" height="236" rx="18" fill="#10131c" stroke="#3a4260" strokeWidth="3" /><rect x="278" y="36" width="108" height="220" rx="12" fill="url(#scr2)" /><circle cx="332" cy="46" r="4" fill="#10131c" /></g>
      <g><rect x="410" y="112" width="52" height="64" rx="14" fill="#161b2b" stroke="#3a4260" strokeWidth="3" /><rect x="416" y="120" width="40" height="48" rx="9" fill="#1d4ed8" /><rect x="420" y="86" width="32" height="26" rx="6" fill="#222a42" /><rect x="420" y="176" width="32" height="26" rx="6" fill="#222a42" /><text x="436" y="150" fontSize="14" fontWeight="700" fill="#fff" textAnchor="middle">10:09</text></g>
      <g><rect x="78" y="196" width="40" height="52" rx="14" fill="#f2f4f8" /><circle cx="98" cy="214" r="7" fill="#c9d0de" /><rect x="102" y="232" width="44" height="40" rx="12" fill="#e7eaf1" transform="rotate(14 102 232)" /></g>
    </svg>
  );
}
