import { useState } from 'react'
import {
  useNotasCliente,
  useCriarNotaCliente,
  useMarcarNotaLida,
} from '@/hooks/use-interacoes-crm'

interface Props {
  clienteId: number
  imovelVersaoId?: number | null
}

export function SecaoNotas({ clienteId, imovelVersaoId }: Props) {
  const { data: notas } = useNotasCliente(clienteId, imovelVersaoId ?? undefined)
  const criar = useCriarNotaCliente(clienteId)
  const marcar = useMarcarNotaLida()
  const [texto, setTexto] = useState('')

  async function enviar() {
    if (!texto.trim()) return
    await criar.mutateAsync({
      imovelVersaoId: imovelVersaoId ?? null,
      conteudo: texto.trim(),
    })
    setTexto('')
  }

  return (
    <div className="space-y-3">
      <div className="max-h-80 overflow-y-auto space-y-2">
        {!notas || notas.length === 0 ? (
          <p className="text-sm text-gray-500">Sem notas.</p>
        ) : (
          notas.map((n) => (
            <div
              key={n.id}
              className={`p-2 rounded-lg ${
                n.autor_tipo === 'consultor'
                  ? 'bg-blue-50 ml-4'
                  : 'bg-gray-100 mr-4'
              }`}
              onMouseEnter={() => {
                if (n.autor_tipo === 'cliente' && !n.lida_pelo_destinatario) {
                  marcar.mutate(n.id)
                }
              }}
            >
              <p className="text-[11px] text-gray-500 mb-1">
                {n.autor_tipo === 'consultor'
                  ? n.autor_nome ?? 'Consultor'
                  : 'Cliente'}
                {' · '}
                {new Date(n.criado_em).toLocaleString('pt-PT')}
                {n.autor_tipo === 'cliente' && !n.lida_pelo_destinatario && (
                  <span className="ml-2 text-red-600 font-semibold">NOVA</span>
                )}
              </p>
              <p className="text-sm whitespace-pre-line text-gray-800">
                {n.conteudo}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t pt-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escrever nota ao cliente…"
          rows={2}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || criar.isPending}
          className="px-4 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50 self-end"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}