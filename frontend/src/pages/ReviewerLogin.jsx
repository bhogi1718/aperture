import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/client';

export function ReviewerLogin() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/reviewer/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { token } = await login({ username, password });
      signIn(token);
      navigate('/reviewer/dashboard', { replace: true });
    } catch (err) {
      setError('Invalid username or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 'var(--space-3xl)', maxWidth: 420 }}>
        <div className="card">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Reviewer Portal</h1>
          <p className="text-muted" style={{ marginTop: 0, marginBottom: 'var(--space-lg)', fontSize: 14 }}>
            Secure access for authorized personnel.
          </p>

          {error && (
            <div style={{ background: 'var(--color-reject-soft)', color: 'var(--color-reject)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ marginTop: 'var(--space-sm)' }}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
