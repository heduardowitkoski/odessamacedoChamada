import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PortalScreen from './pages/Portal/Portal';
import EnrollmentScreen from './pages/Enrollment/Enrollment';
import AdminDashboard from './pages/Admin/AdminDashboard';
import LoginScreen from './pages/Auth/Login';
import ResetPasswordScreen from './pages/Auth/ResetPassword';
import ResponsiblePortal from './pages/Responsible/ResponsiblePortal';
import ProfessorPortal from './pages/Professor/ProfessorPortal';
import MuralPage from './pages/Mural/MuralPage';
import { PrivateRoute } from './components/ui/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal Público */}
        <Route path="/" element={<PortalScreen />} />
        <Route path="/inscrever" element={<EnrollmentScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/redefinir-senha" element={<ResetPasswordScreen />} />

        {/* Mural de Atividades, Tarefas e Obras */}
        <Route path="/mural" element={<MuralPage />} />

        {/* Portal do Aluno / Responsável */}
        <Route
          path="/responsavel"
          element={
            <PrivateRoute requiredRole="responsavel">
              <ResponsiblePortal />
            </PrivateRoute>
          }
        />

        {/* Portal do Professor / Educador */}
        <Route
          path="/professor"
          element={
            <PrivateRoute requiredRole="professor">
              <ProfessorPortal />
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
