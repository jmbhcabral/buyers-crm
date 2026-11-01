import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import {
  useCriarNotaPublica,
  useMarcarNotaLidaPublica,
  useNotasPublicas,
} from '../hooks/use-interacoes'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  token: string
  imovelVersaoId: number
}

export function ModalNotas({ open, onOpenChange, token, imovelVersaoId }: Props) {
  const { data: notas } = useNotasPublicas(token, imovelVersaoId)
  const criar = useCriarNotaPublica(token)
  const marcar = useMarcarNotaLidaPublica(token)
  const [texto, setTexto] = useState('')

  useEffect(() => {
    if (open && notas) {
      notas
        .filter((n) => n.autor_tipo === 'consultor' && !n.lida_pelo_destinatario)
        .forEach((n) => marcar.mutate(n.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notas?.length])

  async function enviar() {
    if (!texto.trim()) return
    await criar.mutateAsync({ imovelVersaoId, conteudo: texto.trim() })
    setTexto('')
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Notas">
      <div className="space-y-3 max-h-96 overflow-y-auto mb-3">
        {!notas || notas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Sem notas ainda. Escreve a primeira mensagem ao teu consultor.
          </p>
        ) : (
          notas.map((n) => (
            <div
              key={n.id}
              className={`p-2 rounded-lg ${
                n.autor_tipo === 'cliente' ? 'bg-blue-50 ml-6' : 'bg-gray-100 mr-6'
              }`}
            >
              <p className="text-[11px] text-gray-500 mb-1">
                {n.autor_tipo === 'consultor' ? 'Consultor' : 'Tu'}
                {' · '}
                {new Date(n.criado_em).toLocaleString('pt-PT')}
              </p>
              <p className="text-sm whitespace-pre-line text-gray-800">{n.conteudo}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t pt-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escrever mensagem…"
          rows={2}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || criar.isPending}
          className="px-4 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50 self-end"
        >
          {criar.isPending ? '…' : 'Enviar'}
        </button>
      </div>
    </Modal>
  )
}