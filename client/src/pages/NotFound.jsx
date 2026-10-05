import { EmptyState } from '../components/States.jsx';

export default function NotFound() {
  return <div className="container page"><div className="card"><EmptyState icon="search" title="Page not found" text="The page you're looking for doesn't exist." actionLabel="Go to Home" actionTo="/" /></div></div>;
}
