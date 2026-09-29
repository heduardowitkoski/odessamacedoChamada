import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PortalScreen from './pages/Portal/Portal';
import EnrollmentScreen from './pages/Enrollment/Enrollment';
import AdminDashboard from './pages/Admin/AdminDashboard';
import LoginScreen from './pages/Auth/Login';
import ResetPasswordScreen from './pages/Auth/ResetPassword';
import ResponsiblePortal from './pages/Responsible/ResponsiblePortal';
import { PrivateRoute } from './components/ui/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalScreen />} />
        <Route path="/inscrever" element={<EnrollmentScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/redefinir-senha" element={<ResetPasswordScreen />} />

        {/* Portal do Responsável (Acompanhamento exclusivo de faltas e frequência) */}
        <Route
          path="/responsavel"
          element={
            <PrivateRoute requiredRole="responsavel">
              <ResponsiblePortal />
            </PrivateRoute>
          }
        />

        {/* Painel Administrativo Protegido (Apenas Admins) */}
        <Route
          path="/admin"
          element={
            <PrivateRoute requiredRole="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
