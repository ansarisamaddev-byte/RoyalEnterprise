import Icon from './Icon.jsx';
import { timelineSteps } from '../utils/status.js';

export default function OrderTimeline({ order }) {
  return (
    <ol className="timeline" aria-label="Order progress">
      {timelineSteps(order).map((s) => (
        <li key={s.label} className={`tl-step${s.done ? ' done' : ''}${s.current ? ' current' : ''}`} aria-current={s.current ? 'step' : undefined}>
          <span className="tl-dot">{s.done && <Icon name="check" size={13} strokeWidth={3} />}</span>
          <span>
            <span className="tl-label">{s.label}</span>
            {s.current && <span className="tl-sub" style={{ display: 'block' }}>In progress</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
