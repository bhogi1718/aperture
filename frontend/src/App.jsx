import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ApplicantAuthProvider } from './context/ApplicantAuthContext';
import { Landing } from './pages/Landing';
import { VerifyEmail } from './pages/VerifyEmail';
import { ApplicationForm } from './pages/ApplicationForm';
import { Results } from './pages/Results';
import { ReviewerLogin } from './pages/ReviewerLogin';
import { ReviewerDashboard } from './pages/ReviewerDashboard';
import { ApplicationDetail } from './pages/ApplicationDetail';

export default function App() {
  return (
    <AuthProvider>
      <ApplicantAuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/apply" element={<ApplicationForm />} />
          <Route path="/results" element={<Results />} />
          <Route path="/applications/:id" element={<Results />} />
          <Route path="/reviewer/login" element={<ReviewerLogin />} />
          <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
          <Route path="/reviewer/applications/:id" element={<ApplicationDetail />} />
        </Routes>
      </ApplicantAuthProvider>
    </AuthProvider>
  );
}
