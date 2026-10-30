import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ListaPage } from './pages/ListaPage'
import { DetalhePage } from './pages/DetalhePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:token" element={<ListaPage />} />
        <Route path="/s/:token/imovel/:versaoId" element={<DetalhePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}