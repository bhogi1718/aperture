import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
    <div className="login-scene">
      <div className="login-scene-blob login-scene-blob-1" aria-hidden="true" />
      <div className="login-scene-blob login-scene-blob-2" aria-hidden="true" />
      <div className="login-scene-blob login-scene-blob-3" aria-hidden="true" />

      <div className="login-card">
        <div className="login-card-brand">
          <span className="app-header-mark" aria-hidden="true">◍</span>
          <span>Aperture</span>
        </div>
        <h1 className="login-card-title">Reviewer Portal</h1>
        <p className="login-card-subtitle">Secure access for authorized personnel.</p>

        {error && (
          <div className="login-card-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label login-card-label" htmlFor="username">Username</label>
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
            <label className="field-label login-card-label" htmlFor="password">Password</label>
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

        <Link to="/" className="login-card-back">← Back to Aperture</Link>
      </div>
    </div>
  );
}
