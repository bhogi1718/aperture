import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { FeatureBar } from '../components/FeatureBar';
import { featureLabel } from '../lib/featureLabels';
import { useAuth } from '../context/AuthContext';
import { getApplication } from '../api/client';

const FRAUD_FLAG_LABELS = {
  implausible_activity_no_footprint: 'High claimed activity volume with no other financial footprint (utility payments or recharge regularity).',
  duplicate_narrative_recent: 'This narrative text matches another application submitted in the last hour.',
};

export function ApplicationDetail() {
  const { isAuthenticated, token } = useAuth();
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    getApplication({ token, id })
      .then(setApplication)
      .catch((err) => setError(err.message));
  }, [token, id]);

  if (!isAuthenticated) {
    return <Navigate to="/reviewer/login" replace />;
  }

  return (
    <>
      <Header />
      <main className="page" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
        <Link to="/reviewer/dashboard" className="text-muted" style={{ fontSize: 14, textDecoration: 'none', display: 'inline-block', marginBottom: 'var(--space-md)' }}>
          ← Back to applications
        </Link>

        {error && (
          <div className="card" style={{ borderColor: 'var(--color-reject)', background: 'var(--color-reject-soft)' }}>
            <p style={{ color: 'var(--color-reject)', margin: 0 }}>{error}</p>
          </div>
        )}

        {!application && !error && <p className="text-muted">Loading…</p>}

        {application && (
          <>
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div>
                <p className="mono text-muted" style={{ margin: 0, fontSize: 13, marginBottom: 4 }}>{application.id}</p>
                <RiskBadge tier={application.risk_tier} />
              </div>
              <p className="mono" style={{ margin: 0, fontSize: 15 }}>
                {(application.probability_of_default * 100).toFixed(1)}% estimated risk
              </p>
            </div>

            {application.fraud_flags?.length > 0 && (
              <div className="card" style={{ borderColor: 'var(--color-reject)', background: 'var(--color-reject-soft)', marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--color-reject)' }}>
                  Fraud signals flagged for review
                </h2>
                <ul style={{ margin: 0, paddingLeft: 'var(--space-lg)', color: 'var(--color-reject)', fontSize: 14 }}>
                  {application.fraud_flags.map((flag) => (
                    <li key={flag}>{FRAUD_FLAG_LABELS[flag] ?? flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-lg)' }}>
              <div className="card">
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-md)' }}>Explanation</h2>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
                  {application.explanation}
                </p>
                <h3 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>Top contributing factors</h3>
                {application.top_contributing_features.map((f) => (
                  <FeatureBar
                    key={f.feature}
                    feature={f.feature}
                    shapValue={f.shap_value}
                    maxAbsValue={Math.max(...application.top_contributing_features.map((x) => Math.abs(x.shap_value)), 0.001)}
                  />
                ))}
              </div>

              <div className="card">
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-md)' }}>Submitted features</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {Object.entries(application.features).map(([key, value]) => (
                      <tr key={key} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                        <td style={{ padding: '6px 0', color: 'var(--color-on-surface-variant)' }}>{featureLabel(key)}</td>
                        <td style={{ padding: '6px 0', textAlign: 'right' }} className="mono">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {application.transaction_narrative && (
                  <>
                    <h3 className="label-caps" style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-sm)' }}>
                      Narrative (guardrail-applied)
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{application.transaction_narrative}</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
