const TIER_CONFIG = {
  Approve: { label: 'Approve', className: 'badge-approve' },
  'Manual Review': { label: 'Manual Review', className: 'badge-review' },
  Reject: { label: 'Reject', className: 'badge-reject' },
};

export function RiskBadge({ tier }) {
  const config = TIER_CONFIG[tier] ?? { label: tier, className: 'badge-review' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
