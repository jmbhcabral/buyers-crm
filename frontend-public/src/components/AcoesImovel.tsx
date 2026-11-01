import { useState } from 'react'
import { Heart, Calendar, MessageCircle } from 'lucide-react'
import type { EstadoImovel } from '../types'
import { useInteracoesPublico, useToggleInteresse } from '../hooks/use-interacoes'
import { ModalPedidoVisita } from './ModalPedidoVisita'
import { ModalNotas } from './ModalNotas'

interface Props {
  token: string
  imovelVersaoId: number
  estado: EstadoImovel
  layout?: 'card' | 'sticky'
}

export function AcoesImovel({
  token,
  imovelVersaoId,
  estado,
  layout = 'card',
}: Props) {
  const [visitaAberta, setVisitaAberta] = useState(false)
  const [notasAberta, setNotasAberta] = useState(false)
  const { data: resumo } = useInteracoesPublico(token)
  const toggle = useToggleInteresse(token)

  const indisponivel = estado === 'vendido' || estado === 'saiu_mercado'
  const visitaDesativada = estado !== 'disponivel'

  const temInteresse = resumo?.interesses.includes(imovelVersaoId) ?? false
  const numPedidos = resumo?.por_imovel[imovelVersaoId]?.pedidos ?? 0
  const temNotasNovas = (resumo?.notas_nao_lidas ?? 0) > 0

  function handleInteresse() {
    if (indisponivel) return
    toggle.mutate({ versaoId: imovelVersaoId, ativo: !temInteresse })
  }

  const container =
    layout === 'sticky'
      ? 'flex items-center gap-2'
      : 'flex items-center gap-2 px-4 pb-3 pt-2 border-t'

  return (
    <>
      <div className={container}>
        <button
          onClick={handleInteresse}
          disabled={indisponivel || toggle.isPending}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition ${
            temInteresse
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          } disabled:opacity-40`}
        >
          <Heart className={`h-4 w-4 ${temInteresse ? 'fill-current' : ''}`} />
          <span>{temInteresse ? 'Interessado' : 'Interesse'}</span>
        </button>
        <button
          onClick={() => setVisitaAberta(true)}
          disabled={visitaDesativada}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40"
        >
          <Calendar className="h-4 w-4" />
          <span>Visita</span>
        </button>
        <button
          onClick={() => setNotasAberta(true)}
          className="relative flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Notas{numPedidos > 0 ? ` (${numPedidos})` : ''}</span>
          {temNotasNovas && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      <ModalPedidoVisita
        open={visitaAberta}
        onOpenChange={setVisitaAberta}
        token={token}
        imovelVersaoId={imovelVersaoId}
      />
      <ModalNotas
        open={notasAberta}
        onOpenChange={setNotasAberta}
        token={token}
        imovelVersaoId={imovelVersaoId}
      />
    </>
  )
}