import { useInteracoesImovel, useAtualizarInteracao } from '@/hooks/use-interacoes-crm'
import type { EstadoInteracao } from '@/types'

const TIPO_LABEL: Record<string, string> = {
  interesse: 'Interesse',
  pedido_visita: 'Pedido de visita',
  pedido_info: 'Pedido de informação',
}

const ESTADO_CLS: Record<EstadoInteracao, string> = {
  pendente:  'bg-amber-100 text-amber-800',
  visto:     'bg-blue-100 text-blue-800',
  concluido: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-200 text-gray-700',
}

export function SecaoInteracoesImovel({ versaoId }: { versaoId: number }) {
  const { data, isLoading } = useInteracoesImovel(versaoId)
  const mut = useAtualizarInteracao()

  if (isLoading) return <p className="text-sm text-gray-500">A carregar…</p>
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">Sem interações neste imóvel.</p>
  }

  return (
    <ul className="space-y-2">
      {data.map((i) => (
        <li key={i.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  {TIPO_LABEL[i.tipo] ?? i.tipo}
                </span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${ESTADO_CLS[i.estado]}`}>
                  {i.estado}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 truncate">
                {i.cliente_nome}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                {new Date(i.criado_em).toLocaleString('pt-PT')}
              </p>
              {i.payload && Object.keys(i.payload).length > 0 && (
                <pre className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap break-all">
                  {JSON.stringify(i.payload, null, 2)}
                </pre>
              )}
            </div>
            {(i.estado === 'pendente' || i.estado === 'visto') && (
              <div className="flex flex-col gap-1 shrink-0">
                {i.estado === 'pendente' && (
                  <button
                    onClick={() => mut.mutate({ id: i.id, estado: 'visto' })}
                    className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700"
                  >
                    Visto
                  </button>
                )}
                <button
                  onClick={() => mut.mutate({ id: i.id, estado: 'concluido' })}
                  className="text-xs px-2 py-1 rounded bg-green-50 text-green-700"
                >
                  Concluir
                </button>
                <button
                  onClick={() => mut.mutate({ id: i.id, estado: 'cancelado' })}
                  className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}