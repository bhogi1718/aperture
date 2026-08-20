import { createContext, useContext, useState, useCallback } from 'react';

const ApplicantAuthContext = createContext(null);

const TOKEN_KEY = 'aperture_applicant_token';
const APPLICANT_KEY = 'aperture_applicant_info';

export function ApplicantAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [applicant, setApplicant] = useState(() => {
    const stored = localStorage.getItem(APPLICANT_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const signIn = useCallback((newToken, applicantInfo) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(APPLICANT_KEY, JSON.stringify(applicantInfo));
    setToken(newToken);
    setApplicant(applicantInfo);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(APPLICANT_KEY);
    setToken(null);
    setApplicant(null);
  }, []);

  return (
    <ApplicantAuthContext.Provider value={{ token, applicant, isVerified: Boolean(token), signIn, signOut }}>
      {children}
    </ApplicantAuthContext.Provider>
  );
}

export function useApplicantAuth() {
  const ctx = useContext(ApplicantAuthContext);
  if (!ctx) throw new Error('useApplicantAuth must be used within ApplicantAuthProvider');
  return ctx;
}
