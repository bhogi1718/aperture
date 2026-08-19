import { Link } from 'react-router-dom';
import { Header } from '../components/Header';

const HIGHLIGHTS = [
  {
    title: 'Alternative data',
    body: 'Go beyond credit scores by looking at utility payments, mobile recharge, and gig-platform activity.',
  },
  {
    title: 'Explainable score',
    body: 'Know exactly why you were approved, and what would need to change.',
  },
  {
    title: 'Fast decision',
    body: 'Get results in seconds, not days. Your data is never shared.',
  },
];

export function Landing() {
  return (
    <>
      <Header right={<Link to="/reviewer/login" className="text-muted" style={{ fontSize: 14, textDecoration: 'none' }}>Reviewer sign in</Link>} />
      <main className="page-narrow" style={{ paddingTop: 'var(--space-3xl)', paddingBottom: 'var(--space-3xl)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 'var(--space-md)' }}>
            Credit decisions for people banks can't see yet.
          </h1>
          <p className="text-muted" style={{ fontSize: 18, marginBottom: 'var(--space-xl)' }}>
            Built from your real payment behavior, not just a bureau file.
          </p>
          <Link to="/apply" className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
            Check my eligibility →
          </Link>
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-md)', marginTop: 'var(--space-3xl)' }}>
          {HIGHLIGHTS.map((item) => (
            <div key={item.title} className="card" style={{ boxShadow: 'none' }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 'var(--space-xs)' }}>{item.title}</h2>
              <p className="text-muted" style={{ fontSize: 15, margin: 0 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </main>
      <footer style={{ borderTop: '1px solid var(--color-outline-variant)', padding: 'var(--space-xl) 0', textAlign: 'center' }}>
        <p className="label-caps" style={{ margin: 0 }}>Secure Application Portal</p>
      </footer>
    </>
  );
}
