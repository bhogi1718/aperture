import { featureLabel } from '../lib/featureLabels';

// SHAP values from the model can have any magnitude; scale each bar relative
// to the largest |shap_value| in the set passed in, so the most influential
// factor always reads as a full-width bar.
export function FeatureBar({ feature, shapValue, maxAbsValue }) {
  const magnitude = maxAbsValue > 0 ? Math.min(Math.abs(shapValue) / maxAbsValue, 1) : 0;
  const raisedRisk = shapValue > 0;

  return (
    <div className="feature-bar">
      <div className="feature-bar-row">
        <span className="feature-bar-label">{featureLabel(feature)}</span>
        <span
          className="feature-bar-value mono"
          style={{ color: raisedRisk ? 'var(--color-reject)' : 'var(--color-approve)' }}
        >
          {raisedRisk ? '+' : '−'} risk
        </span>
      </div>
      <div className="feature-bar-track">
        <div
          className="feature-bar-fill"
          style={{
            width: `${magnitude * 100}%`,
            background: raisedRisk ? 'var(--color-reject)' : 'var(--color-approve)',
          }}
        />
      </div>
    </div>
  );
}
