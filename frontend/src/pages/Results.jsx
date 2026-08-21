import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { FeatureBar } from '../components/FeatureBar';
import { featureLabel, formatFeatureValue, FEATURE_GROUPS } from '../lib/featureLabels';
import { useApplicantAuth } from '../context/ApplicantAuthContext';
import { runCounterfactual, getMyApplication } from '../api/client';

const TIER_COPY = {
  Approve: { icon: '✓', message: 'Your application looks strong.' },
  'Manual Review': { icon: '⏳', message: 'A human reviewer will take a closer look.' },
  Reject: { icon: '✕', message: "This application doesn't meet our current criteria." },
};

const COUNTERFACTUAL_FEATURES = [
  { key: 'utility_payment_streak', min: 0, max: 36, step: 1 },
  { key: 'recharge_regularity_score', min: 0, max: 100, step: 1 },
  { key: 'gig_rating', min: 1, max: 5, step: 0.1 },
].map((f) => ({ ...f, label: featureLabel(f.key) }));

function ProfileFeatureSummary({ features, narrative }) {
  if (!features) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
      {/* Alternative behavioral card */}
      <div className="card" style={{ borderColor: 'var(--color-accent-soft)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Alternative Behavioral Footprint</h3>
          <span className="badge badge-approve" style={{ fontSize: 11 }}>NTC Factors</span>
        </div>
        <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 'var(--space-md)' }}>
          Signals evaluated from regular payments and verified platform activity.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {FEATURE_GROUPS.alternative.keys.map((key) => {
              const val = features[key];
              if (val === undefined) return null;
              return (
                <tr key={key} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                  <td style={{ padding: '6px 0', color: 'var(--color-on-surface-variant)' }}>{featureLabel(key)}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }} className="mono">
                    {formatFeatureValue(key, val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Financial & Demographics card */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Submitted Profile & Financial Summary</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {FEATURE_GROUPS.profile.keys.concat(FEATURE_GROUPS.financial.keys).map((key) => {
              const val = features[key];
              if (val === undefined) return null;
              return (
                <tr key={key} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                  <td style={{ padding: '5px 0', color: 'var(--color-on-surface-variant)' }}>{featureLabel(key)}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right' }} className="mono">
                    {formatFeatureValue(key, val)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {narrative && (
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Income Narrative (Guardrail Redacted)</h3>
          <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 }}>
            {narrative}
          </p>
        </div>
      )}
    </div>
  );
}

function CounterfactualExplorer({ applicant }) {
  const [featureKey, setFeatureKey] = useState(COUNTERFACTUAL_FEATURES[0].key);
  const feature = COUNTERFACTUAL_FEATURES.find((f) => f.key === featureKey);
  const [value, setValue] = useState(applicant[featureKey]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleFeatureChange(key) {
    setFeatureKey(key);
    const next = COUNTERFACTUAL_FEATURES.find((f) => f.key === key);
    setValue(applicant[key] ?? next.min);
    setResult(null);
  }

  async function handleRecalculate() {
    setLoading(true);
    setError(null);
    try {
      const data = await runCounterfactual({
        applicant,
        featureToPerturb: featureKey,
        newValue: Number(value),
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not recalculate.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ background: 'var(--color-accent-soft)', border: 'none' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>What could change this?</h2>
      <p className="text-muted" style={{ fontSize: 14, marginTop: 0, marginBottom: 'var(--space-md)' }}>
        Explore how different circumstances might affect the automated outcome.
      </p>

      <div className="card" style={{ boxShadow: 'none' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <label className="field-label" htmlFor="cf-feature">Select factor</label>
            <select id="cf-feature" className="input" value={featureKey} onChange={(e) => handleFeatureChange(e.target.value)}>
              {COUNTERFACTUAL_FEATURES.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <label className="field-label" htmlFor="cf-value">
              Adjust value <span className="mono">{Number(value).toFixed(feature.step < 1 ? 1 : 0)}</span>
            </label>
            <input
              id="cf-value"
              className="slider"
              type="range"
              min={feature.min}
              max={feature.max}
              step={feature.step}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleRecalculate} disabled={loading}>
            {loading ? 'Calculating…' : 'Recalculate'}
          </button>
        </div>

        {error && <p className="field-error" style={{ marginTop: 'var(--space-md)' }}>{error}</p>}

        {result && (
          <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              If <strong>{feature.label}</strong> changed to <strong className="mono">{Number(value).toFixed(feature.step < 1 ? 1 : 0)}</strong>,
              the estimated risk would move to{' '}
              <strong className="mono">{(result.new_probability * 100).toFixed(1)}%</strong>
              {result.tier_changed ? (
                <> — moving the decision from <RiskBadge tier={result.original_tier} /> to <RiskBadge tier={result.new_tier} /></>
              ) : (
                <> (decision stays <RiskBadge tier={result.new_tier} />)</>
              )}
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PastApplicationView({ id }) {
  const { token, isVerified, email } = useApplicantAuth();
  const [application, setApplication] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    getMyApplication({ token, id })
      .then(setApplication)
      .catch((err) => setError(err.message));
  }, [token, id]);

  if (!isVerified) {
    return <Navigate to="/verify" replace />;
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="page-narrow" style={{ paddingTop: 'var(--space-xl)' }}>
          <div className="card" style={{ borderColor: 'var(--color-reject)', background: 'var(--color-reject-soft)' }}>
            <p style={{ color: 'var(--color-reject)', margin: 0 }}>{error}</p>
          </div>
        </main>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <Header />
        <main className="page-narrow" style={{ paddingTop: 'var(--space-xl)' }}>
          <p className="text-muted">Loading…</p>
        </main>
      </>
    );
  }

  const tierInfo = TIER_COPY[application.risk_tier] ?? TIER_COPY['Manual Review'];
  const maxAbsValue = Math.max(...application.top_contributing_features.map((f) => Math.abs(f.shap_value)), 0.001);

  return (
    <>
      <Header />
      <main className="page" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
        <Link to="/verify" className="text-muted" data-print-hide style={{ fontSize: 14, textDecoration: 'none', display: 'inline-block', marginBottom: 'var(--space-md)' }}>
          ← Back to your applications
        </Link>

        {/* Header summary banner */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 28 }} aria-hidden="true">{tierInfo.icon}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                <RiskBadge tier={application.risk_tier} />
                <span className="mono text-muted" style={{ fontSize: 12 }}>ID: {application.id?.slice(0, 8)}…</span>
              </div>
              <p className="text-muted mono" style={{ margin: 0, fontSize: 14 }}>
                Estimated risk: {(application.probability_of_default * 100).toFixed(1)}% {email && `• Account: ${email}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <p className="text-muted" style={{ margin: 0, maxWidth: 300, fontSize: 14 }}>{tierInfo.message}</p>
            <button type="button" className="btn btn-secondary" data-print-hide onClick={() => window.print()}>
              ↓ Download PDF
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 'var(--space-lg)' }}>
          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-md)' }}>Why this decision</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
              {application.explanation}
            </p>
            <h3 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>Top contributing factors (SHAP)</h3>
            {application.top_contributing_features.map((f) => (
              <FeatureBar key={f.feature} feature={f.feature} shapValue={f.shap_value} maxAbsValue={maxAbsValue} />
            ))}
          </div>

          <div>
            <ProfileFeatureSummary features={application.features} narrative={application.transaction_narrative} />
          </div>
        </div>
      </main>
    </>
  );
}

export function Results() {
  const location = useLocation();
  const { id } = useParams();
  const { result, applicant } = location.state ?? {};

  if (id) {
    return <PastApplicationView id={id} />;
  }

  if (!result || !applicant) {
    return <Navigate to="/apply" replace />;
  }

  const tierInfo = TIER_COPY[result.riskTier] ?? TIER_COPY['Manual Review'];
  const maxAbsValue = Math.max(...result.topContributingFeatures.map((f) => Math.abs(f.shap_value)), 0.001);

  return (
    <>
      <Header />
      <main className="page" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 28 }} aria-hidden="true">{tierInfo.icon}</span>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                <RiskBadge tier={result.riskTier} />
              </h1>
              <p className="text-muted mono" style={{ margin: 0, fontSize: 14 }}>
                Estimated risk: {(result.probabilityOfDefault * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-muted" style={{ margin: 0, maxWidth: 320, fontSize: 14 }}>{tierInfo.message}</p>
          <button
            type="button"
            className="btn btn-secondary"
            data-print-hide
            onClick={() => window.print()}
          >
            ↓ Download PDF Report
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', minWidth: 0 }}>
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-md)' }}>Why this decision</h2>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
                {result.explanation}
              </p>
              <h3 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>Top contributing factors</h3>
              {result.topContributingFeatures.map((f) => (
                <FeatureBar key={f.feature} feature={f.feature} shapValue={f.shap_value} maxAbsValue={maxAbsValue} />
              ))}
            </div>

            <div data-print-hide>
              <CounterfactualExplorer applicant={applicant} />
            </div>

            {/* Profile and Submitted Features Summary */}
            <ProfileFeatureSummary features={applicant} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', minWidth: 0 }}>
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Applicants like you</h2>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 'var(--space-md)' }}>
                Outcomes for recent applicants with comparable data.
              </p>
              {result.cohort.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 14 }}>
                  You're the first applicant in this comparison group.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {result.cohort.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
                      <RiskBadge tier={c.risk_tier} />
                      <span className="mono text-muted" style={{ fontSize: 12 }}>
                        {(100 - c.distance * 100).toFixed(0)}% similar
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link to="/apply" className="btn btn-secondary btn-block" data-print-hide style={{ textDecoration: 'none' }}>
              Apply again
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

