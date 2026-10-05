import Icon from './Icon.jsx';

export default function Qty({ value, onChange, max = 10, small = false, label = 'Quantity' }) {
  return (
    <div className={`qty${small ? ' sm' : ''}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity"><Icon name="minus" size={14} /></button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity"><Icon name="plus" size={14} /></button>
    </div>
  );
}
