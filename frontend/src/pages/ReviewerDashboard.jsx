import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { useAuth } from '../context/AuthContext';
import { listApplications } from '../api/client';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const FRAUD_FLAG_LABELS = {
  implausible_activity_no_footprint: 'High claimed activity, no other financial footprint',
  duplicate_narrative_recent: 'Duplicate narrative submitted recently',
};

function FraudFlags({ flags }) {
  if (!flags || flags.length === 0) {
    return <span className="text-muted" style={{ fontSize: 13 }}>—</span>;
  }
  return (
    <span
      className="badge badge-reject"
      title={flags.map((f) => FRAUD_FLAG_LABELS[f] ?? f).join('; ')}
    >
      {flags.length} flag{flags.length > 1 ? 's' : ''}
    </span>
  );
}

export function ReviewerDashboard() {
  const { isAuthenticated, token, signOut } = useAuth();
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    listApplications({ token })
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message));
  }, [token]);

  if (!isAuthenticated) {
    return <Navigate to="/reviewer/login" replace />;
  }

  return (
    <>
      <Header
        right={
          <button type="button" className="btn btn-secondary" onClick={signOut} style={{ padding: '8px 16px', fontSize: 13 }}>
            Sign out
          </button>
        }
      />
      <main className="page" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Application Reviews</h1>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--space-lg)' }}>
          Manage and review incoming applications.
        </p>

        {error && (
          <div className="card" style={{ borderColor: 'var(--color-reject)', background: 'var(--color-reject-soft)', marginBottom: 'var(--space-lg)' }}>
            <p style={{ color: 'var(--color-reject)', margin: 0 }}>{error}</p>
          </div>
        )}

        {applications === null && !error && <p className="text-muted">Loading…</p>}

        {applications?.length === 0 && (
          <div className="card">
            <p className="text-muted" style={{ margin: 0 }}>No applications yet.</p>
          </div>
        )}

        {applications?.length > 0 && (
          <div className="card" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                  <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Application ID</th>
                  <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Submitted</th>
                  <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Risk tier</th>
                  <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Default probability</th>
                  <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                    <td style={{ padding: 'var(--space-md)' }}>
                      <Link to={`/reviewer/applications/${app.id}`} className="mono" style={{ fontSize: 13, textDecoration: 'none', color: 'var(--color-accent)' }}>
                        {app.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td style={{ padding: 'var(--space-md)', fontSize: 14 }}>{formatDate(app.created_at)}</td>
                    <td style={{ padding: 'var(--space-md)' }}>
                      <RiskBadge tier={app.risk_tier} />
                    </td>
                    <td style={{ padding: 'var(--space-md)' }} className="mono">
                      {(app.probability_of_default * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: 'var(--space-md)' }}>
                      <FraudFlags flags={app.fraud_flags} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
