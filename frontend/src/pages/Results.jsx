import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { FeatureBar } from '../components/FeatureBar';
import { runCounterfactual } from '../api/client';

const TIER_COPY = {
  Approve: { icon: '✓', message: 'Your application looks strong.' },
  'Manual Review': { icon: '⏳', message: 'A human reviewer will take a closer look.' },
  Reject: { icon: '✕', message: "This application doesn't meet our current criteria." },
};

const COUNTERFACTUAL_FEATURES = [
  { key: 'utility_payment_streak', label: 'Utility Payment Streak', min: 0, max: 36, step: 1 },
  { key: 'recharge_regularity_score', label: 'Mobile Recharge Regularity', min: 0, max: 100, step: 1 },
  { key: 'gig_rating', label: 'Platform or Client Rating', min: 1, max: 5, step: 0.1 },
];

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

export function Results() {
  const location = useLocation();
  const { result, applicant } = location.state ?? {};

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

            <CounterfactualExplorer applicant={applicant} />
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

            <Link to="/apply" className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>
              Apply again
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
