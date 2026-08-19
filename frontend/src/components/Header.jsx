import { Link } from 'react-router-dom';

export function Header({ right }) {
  return (
    <header className="app-header">
      <div className="page app-header-inner">
        <Link to="/" className="app-header-brand">
          <span className="app-header-mark" aria-hidden="true">◍</span>
          Aperture
        </Link>
        <div className="app-header-right">{right}</div>
      </div>
    </header>
  );
}
