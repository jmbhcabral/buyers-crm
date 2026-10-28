import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { useAuth } from '@/lib/use-auth'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Imoveis from '@/pages/Imoveis'
import ImovelDetalhe from '@/pages/ImovelDetalhe'
import Clientes from '@/pages/Clientes'
import Perfil from '@/pages/Perfil'
import Pdfs from './pages/Pdfs'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Admin from './pages/Admin'

function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    if (!user?.is_admin) return <Navigate to="/" replace />
    return <>{children}</>
  }

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
          <Route path="/imoveis/:id" element={<ImovelDetalhe />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/pdfs" element={<Pdfs />} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}