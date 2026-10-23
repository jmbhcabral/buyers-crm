import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Imoveis from '@/pages/Imoveis'
import Clientes from '@/pages/Clientes'
import Perfil from '@/pages/Perfil'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/imoveis" element={<Imoveis />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}