import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { FeatureBar } from '../components/FeatureBar';
import { featureLabel, formatFeatureValue, FEATURE_GROUPS } from '../lib/featureLabels';
import { FRAUD_FLAG_LABELS } from '../lib/fraudFlagLabels';
import { useAuth } from '../context/AuthContext';
import { getApplication, decideApplication } from '../api/client';

function ReviewerDecisionPanel({ application, token, onDecided }) {
  const [submitting, setSubmitting] = useState(null); // null | 'Approved' | 'Rejected'
  const [error, setError] = useState(null);

  if (application.risk_tier !== 'Manual Review') return null;

  if (application.reviewer_decision) {
    return (
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reviewer decision</h2>
        <p style={{ margin: 0, fontSize: 14 }}>
          <strong>{application.reviewer_decision}</strong> by {application.reviewer_username} on{' '}
          {new Date(application.reviewer_decided_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
    );
  }

  async function handleDecide(decision) {
    setSubmitting(decision);
    setError(null);
    try {
      const updated = await decideApplication({ token, id: application.id, decision });
      onDecided(updated);
    } catch (err) {
      setError(err.message || 'Could not record decision.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="card" data-print-hide style={{ marginBottom: 'var(--space-lg)' }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>This application needs a decision</h2>
      <p className="text-muted" style={{ fontSize: 14, marginTop: 0, marginBottom: 'var(--space-md)' }}>
        The model couldn't confidently approve or reject this application. Review the applicant profile,
        explanation, and factors below, then record a decision.
      </p>
      {error && <p className="field-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={submitting !== null}
          onClick={() => handleDecide('Approved')}
        >
          {submitting === 'Approved' ? 'Approving…' : '✓ Approve'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ borderColor: 'var(--color-reject)', color: 'var(--color-reject)' }}
          disabled={submitting !== null}
          onClick={() => handleDecide('Rejected')}
        >
          {submitting === 'Rejected' ? 'Rejecting…' : '✕ Reject'}
        </button>
      </div>
    </div>
  );
}

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
        <Link
          to="/reviewer/dashboard"
          className="text-muted"
          data-print-hide
          style={{ fontSize: 14, textDecoration: 'none', display: 'inline-block', marginBottom: 'var(--space-md)' }}
        >
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
            {/* Applicant Profile Header */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                  <span className="label-caps" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Applicant Dossier</span>
                  <h1 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 8px 0' }}>
                    {application.applicant_name || 'Anonymous Applicant'}
                  </h1>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', fontSize: 14 }}>
                    <div>
                      <span className="text-muted">Email: </span>
                      <strong className="mono">{application.applicant_email || 'No email attached'}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Application ID: </span>
                      <span className="mono text-muted">{application.id}</span>
                    </div>
                    <div>
                      <span className="text-muted">Submitted: </span>
                      <span>
                        {new Date(application.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <RiskBadge tier={application.risk_tier} />
                    <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                      {(application.probability_of_default * 100).toFixed(1)}% risk
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-print-hide
                    onClick={() => window.print()}
                    style={{ padding: '6px 14px', fontSize: 13 }}
                  >
                    ↓ Download PDF Report
                  </button>
                </div>
              </div>
            </div>

            <ReviewerDecisionPanel
              application={application}
              token={token}
              onDecided={(updated) => setApplication((prev) => ({ ...prev, ...updated }))}
            />

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

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 'var(--space-lg)' }}>
              {/* Left Column: AI & SHAP Explainability */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="card">
                  <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-md)' }}>AI Underwriting Explanation</h2>
                  <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 'var(--space-lg)', fontSize: 14 }}>
                    {application.explanation}
                  </p>
                  <h3 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>Top contributing factors (SHAP)</h3>
                  {(application.top_contributing_features ?? []).map((f) => (
                    <FeatureBar
                      key={f.feature}
                      feature={f.feature}
                      shapValue={f.shap_value}
                      maxAbsValue={Math.max(...(application.top_contributing_features ?? []).map((x) => Math.abs(x.shap_value)), 0.001)}
                    />
                  ))}
                </div>

                {application.transaction_narrative && (
                  <div className="card">
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Applicant Income Narrative</h2>
                    <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 'var(--space-sm)' }}>
                      Sensitive terms (gender, religion, caste, disability, marital status) stripped by bias guardrail.
                    </p>
                    <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-md)', fontSize: 13, lineHeight: 1.6 }}>
                      {application.transaction_narrative}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Structured Applicant Profile & Alternative Signals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* Alternative Behavioral Signals */}
                <div className="card" style={{ borderColor: 'var(--color-accent-soft)', background: 'var(--color-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Alternative Behavioral Data</h2>
                    <span className="badge badge-approve" style={{ fontSize: 11 }}>NTC Differentiator</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 'var(--space-md)' }}>
                    Signals captured from recurring payments and platform activity.
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {FEATURE_GROUPS.alternative.keys.map((key) => (
                        <tr key={key} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                          <td style={{ padding: '8px 0', color: 'var(--color-on-surface-variant)' }}>{featureLabel(key)}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }} className="mono">
                            {formatFeatureValue(key, application.features[key])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Traditional Financial & Bureau Footprint */}
                <div className="card">
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Financial & Bureau Factors</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {FEATURE_GROUPS.financial.keys.map((key) => {
                        const val = application.features[key];
                        if (val === undefined) return null;
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                            <td style={{ padding: '6px 0', color: 'var(--color-on-surface-variant)' }}>{featureLabel(key)}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right' }} className="mono">
                              {formatFeatureValue(key, val)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Demographics */}
                <div className="card">
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Demographics & Household</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {FEATURE_GROUPS.profile.keys.map((key) => {
                        const val = application.features[key];
                        if (val === undefined) return null;
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                            <td style={{ padding: '6px 0', color: 'var(--color-on-surface-variant)' }}>{featureLabel(key)}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right' }} className="mono">
                              {formatFeatureValue(key, val)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

