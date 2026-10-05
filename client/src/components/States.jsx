import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

export function Loading({ text = 'Loading...' }) {
  return (
    <div className="state" role="status">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state" role="alert">
      <div className="icon-wrap"><Icon name="x" /></div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && <button className="btn btn-primary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ icon = 'package', title, text, actionLabel, actionTo }) {
  return (
    <div className="state">
      <div className="icon-wrap"><Icon name={icon} size={26} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionTo && <Link to={actionTo} className="btn btn-primary">{actionLabel}</Link>}
    </div>
  );
}
