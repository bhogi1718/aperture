import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'aperture_reviewer_token';

// Display-only: the token is already issued and verified server-side on
// every API call, so decoding its payload client-side just to show the
// reviewer's username in the header carries no additional trust.
function decodeUsername(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY));
  const [reviewer, setReviewer] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? decodeUsername(stored) : null;
  });

  const signIn = useCallback((newToken) => {
    sessionStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
    setReviewer(decodeUsername(newToken));
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setReviewer(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, reviewer, isAuthenticated: Boolean(token), signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
