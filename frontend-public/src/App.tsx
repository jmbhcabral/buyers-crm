import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { ListaPage } from './pages/ListaPage'
import { DetalhePage } from './pages/DetalhePage'

// Wrappers que forçam remount quando o token/versaoId muda.
// Sem isto, o React Router reutiliza o componente e vês o estado antigo.
function ListaRoute() {
  const { token } = useParams<{ token: string }>()
  return <ListaPage key={token ?? 'none'} />
}

function DetalheRoute() {
  const { token, versaoId } = useParams<{ token: string; versaoId: string }>()
  return <DetalhePage key={`${token ?? 'none'}-${versaoId ?? 'none'}`} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:token" element={<ListaRoute />} />
        <Route path="/s/:token/imovel/:versaoId" element={<DetalheRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}