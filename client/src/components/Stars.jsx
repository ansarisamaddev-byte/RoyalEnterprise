export default function Stars({ value = 0 }) {
  const full = Math.round(value);
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? 'on' : ''}>★</span>
      ))}
    </span>
  );
}
