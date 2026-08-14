import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PortalScreen from './pages/Portal/Portal'
import EnrollmentScreen from './pages/Enrollment/Enrollment'
import AdminDashboard from './pages/Admin/AdminDashboard'
import LoginScreen from './pages/Auth/Login'
import { PrivateRoute } from './components/ui/PrivateRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalScreen />} />
        <Route path="/inscrever" element={<EnrollmentScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        
        {/* Rota Protegida */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
