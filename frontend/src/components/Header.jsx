import { Link } from 'react-router-dom';
import { useApplicantAuth } from '../context/ApplicantAuthContext';
import { useAuth } from '../context/AuthContext';

export function Header({ right }) {
  const { isVerified: isApplicantVerified, applicant, signOut: applicantSignOut } = useApplicantAuth();
  const { isAuthenticated: isReviewerAuth, reviewer, signOut: reviewerSignOut } = useAuth();

  let headerRightContent = right;

  if (!headerRightContent) {
    if (isApplicantVerified && applicant) {
      const displayName = applicant.name || applicant.email?.split('@')[0] || 'Applicant';
      const initial = (applicant.name || applicant.email || 'A').charAt(0).toUpperCase();

      headerRightContent = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--color-outline-variant)',
              }}
              title={applicant.email}
            >
              {initial}
            </div>
            <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-on-surface)' }}>{displayName}</div>
              <div className="text-muted mono" style={{ fontSize: 11 }}>{applicant.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={applicantSignOut}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
          >
            Sign out
          </button>
        </div>
      );
    } else if (isReviewerAuth) {
      headerRightContent = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span className="badge badge-review" style={{ fontSize: 12 }}>
            Reviewer Portal{reviewer ? ` · ${reviewer}` : ''}
          </span>
          <button
            type="button"
            onClick={reviewerSignOut}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
          >
            Sign out
          </button>
        </div>
      );
    }
  }

  return (
    <header className="app-header" data-print-hide>
      <div className="page app-header-inner">
        <Link to="/" className="app-header-brand">
          <span className="app-header-mark" aria-hidden="true">◍</span>
          Aperture
        </Link>
        <div className="app-header-right">{headerRightContent}</div>
      </div>
    </header>
  );
}

