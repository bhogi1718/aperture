const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export function submitApplication({ applicant, transactionNarrative, token }) {
  return request('/api/applications', {
    method: 'POST',
    body: { applicant, transactionNarrative },
    token,
  });
}

export function requestOtp({ phone, name }) {
  return request('/api/applicant-auth/request-otp', {
    method: 'POST',
    body: { phone, name },
  });
}

export function verifyOtp({ phone, name, code }) {
  return request('/api/applicant-auth/verify-otp', {
    method: 'POST',
    body: { phone, name, code },
  });
}

export function getMyApplications({ token }) {
  return request('/api/applicant-auth/me/applications', { token });
}

export function runCounterfactual({ applicant, featureToPerturb, newValue }) {
  return request('/api/applications/counterfactual', {
    method: 'POST',
    body: { applicant, featureToPerturb, newValue },
  });
}

export function login({ username, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function listApplications({ token, limit = 50, offset = 0 }) {
  return request(`/api/applications?limit=${limit}&offset=${offset}`, { token });
}

export function getApplication({ token, id }) {
  return request(`/api/applications/${id}`, { token });
}
