import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export default function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo${light ? ' light' : ''}`} aria-label="Royal Enterprise — home">
      <span className="logo-mark"><Icon name="crown" size={28} /></span>
      <span className="logo-text">
        <b>ROYAL</b>
        <small>ENTERPRISE</small>
      </span>
    </Link>
  );
}
