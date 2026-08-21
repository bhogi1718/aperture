import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { FeatureBar } from '../components/FeatureBar';
import { featureLabel } from '../lib/featureLabels';
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

/**
 * A past application, reopened from the "Welcome back" history table
 * (VerifyEmail.jsx). Fetched by id rather than passed via router state,
 * since state doesn't survive a reload or a brand-new session -- a
 * returning applicant re-verifying days later has none. The applicant-
 * scoped detail endpoint intentionally omits the raw feature payload and
 * cohort data (neither is meaningful to recompute after the fact), so
 * this view skips the counterfactual explorer and cohort card that a
 * fresh submission's Results view shows.
 */
function PastApplicationView({ id }) {
  const { token, isVerified } = useApplicantAuth();
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

        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <span style={{ fontSize: 28 }} aria-hidden="true">{tierInfo.icon}</span>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                <RiskBadge tier={application.risk_tier} />
              </h1>
              <p className="text-muted mono" style={{ margin: 0, fontSize: 14 }}>
                Estimated risk: {(application.probability_of_default * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-muted" style={{ margin: 0, maxWidth: 320, fontSize: 14 }}>{tierInfo.message}</p>
          <button type="button" className="btn btn-secondary" data-print-hide onClick={() => window.print()}>
            ↓ Download PDF
          </button>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-md)' }}>Why this decision</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
            {application.explanation}
          </p>
          <h3 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>Top contributing factors</h3>
          {application.top_contributing_features.map((f) => (
            <FeatureBar key={f.feature} feature={f.feature} shapValue={f.shap_value} maxAbsValue={maxAbsValue} />
          ))}
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
            ↓ Download PDF
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-lg)' }}>
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
