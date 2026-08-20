import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RiskBadge } from '../components/RiskBadge';
import { useApplicantAuth } from '../context/ApplicantAuthContext';
import { requestOtp, verifyOtp } from '../api/client';

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function VerifyEmail() {
  const { signIn } = useApplicantAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('details'); // 'details' | 'code' | 'history'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState(null);

  async function handleRequestOtp(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestOtp({ email, name });
      setDevCode(result.devCode ?? null);
      setStep('code');
    } catch (err) {
      setError(err.message || 'Could not send verification code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyOtp({ email, name, code });
      signIn(result.token, result.applicant);

      if (result.isReturning && result.applications.length > 0) {
        setHistory(result.applications);
        setStep('history');
      } else {
        navigate('/apply');
      }
    } catch (err) {
      setError(err.message || 'Incorrect code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 'var(--space-3xl)', paddingBottom: 'var(--space-3xl)', maxWidth: step === 'history' ? 640 : 420 }}>
        {step === 'details' && (
          <div className="card">
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Verify your email</h1>
            <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--space-lg)', fontSize: 14 }}>
              We'll send a one-time code to confirm it's really you. If you've applied before,
              we'll show your previous results.
            </p>

            {error && (
              <div style={{ background: 'var(--color-reject-soft)', color: 'var(--color-reject)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRequestOtp}>
              <div className="field">
                <label className="field-label" htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="input"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="email">Email address</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="priya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 'var(--space-sm)' }}>
                {submitting ? 'Sending code…' : 'Send verification code'}
              </button>
            </form>
          </div>
        )}

        {step === 'code' && (
          <div className="card">
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Enter your code</h1>
            <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--space-lg)', fontSize: 14 }}>
              We sent a 6-digit code to {email}.
            </p>

            {devCode && (
              <div style={{ background: 'var(--color-accent-soft)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 13 }}>
                <strong>Dev mode:</strong> your code is <span className="mono">{devCode}</span> (no real email was sent).
              </div>
            )}

            {error && (
              <div style={{ background: 'var(--color-reject-soft)', color: 'var(--color-reject)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 14 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <div className="field">
                <label className="field-label" htmlFor="code">Verification code</label>
                <input
                  id="code"
                  className="input mono"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 'var(--space-sm)' }}>
                {submitting ? 'Verifying…' : 'Verify'}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 'var(--space-sm)' }}
              onClick={() => { setStep('details'); setCode(''); setError(null); }}
            >
              ← Use a different email
            </button>
          </div>
        )}

        {step === 'history' && history && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back, {name}</h1>
            <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--space-lg)' }}>
              Here's what we have on file for this email.
            </p>

            <div className="card" style={{ padding: 0, marginBottom: 'var(--space-lg)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                    <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Submitted</th>
                    <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Decision</th>
                    <th className="label-caps" style={{ textAlign: 'left', padding: 'var(--space-md)' }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid var(--color-outline-variant)' }}>
                      <td style={{ padding: 'var(--space-md)', fontSize: 14 }}>{formatDate(app.created_at)}</td>
                      <td style={{ padding: 'var(--space-md)' }}>
                        <RiskBadge tier={app.risk_tier} />
                      </td>
                      <td style={{ padding: 'var(--space-md)' }} className="mono">
                        {(app.probability_of_default * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Link to="/apply" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>
              Apply again
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
