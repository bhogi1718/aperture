import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { ApplicationForm } from './pages/ApplicationForm';
import { Results } from './pages/Results';
import { ReviewerLogin } from './pages/ReviewerLogin';
import { ReviewerDashboard } from './pages/ReviewerDashboard';
import { ApplicationDetail } from './pages/ApplicationDetail';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<ApplicationForm />} />
        <Route path="/results" element={<Results />} />
        <Route path="/reviewer/login" element={<ReviewerLogin />} />
        <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
        <Route path="/reviewer/applications/:id" element={<ApplicationDetail />} />
      </Routes>
    </AuthProvider>
  );
}
