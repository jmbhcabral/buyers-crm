import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useNotasImovel, useMarcarNotaLida } from '@/hooks/use-interacoes-crm'
import type { NotaComContexto } from '@/types'

export function SecaoNotasImovel({ versaoId }: { versaoId: number }) {
  const { data: notas, isLoading } = useNotasImovel(versaoId)
  const marcar = useMarcarNotaLida()

  const byCliente = useMemo(() => {
    const map = new Map<number, NotaComContexto[]>()
    for (const n of notas ?? []) {
      if (!map.has(n.cliente_id)) map.set(n.cliente_id, [])
      map.get(n.cliente_id)!.push(n)
    }
    return map
  }, [notas])

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>
  }
  if (!notas || notas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem notas de clientes neste imóvel.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from(byCliente.entries()).map(([clienteId, thread]) => (
        <div key={clienteId} className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Link
              to={`/clientes/${clienteId}?imovel=${versaoId}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {thread[0].cliente_nome ?? `Cliente #${clienteId}`}
            </Link>
            <Link
              to={`/clientes/${clienteId}?imovel=${versaoId}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              Responder →
            </Link>
          </div>
          <div className="space-y-2">
            {thread.map((n) => (
              <div
                key={n.id}
                className={`p-2 rounded text-sm ${
                  n.autor_tipo === 'consultor'
                    ? 'bg-blue-50 ml-4'
                    : 'bg-gray-100 mr-4'
                }`}
                onMouseEnter={() => {
                  if (
                    n.autor_tipo === 'cliente' &&
                    !n.lida_pelo_destinatario
                  ) {
                    marcar.mutate(n.id)
                  }
                }}
              >
                <p className="text-[11px] text-muted-foreground mb-1">
                  {n.autor_tipo === 'consultor'
                    ? n.autor_nome ?? 'Consultor'
                    : 'Cliente'}
                  {' · '}
                  {new Date(n.criado_em).toLocaleString('pt-PT')}
                  {n.autor_tipo === 'cliente' &&
                    !n.lida_pelo_destinatario && (
                      <span className="ml-2 text-red-600 font-semibold">
                        NOVA
                      </span>
                    )}
                </p>
                <p className="whitespace-pre-line text-foreground">
                  {n.conteudo}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}