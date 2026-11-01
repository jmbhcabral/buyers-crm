import { useState } from 'react'
import { Modal } from './Modal'
import { useCriarPedido } from '../hooks/use-interacoes'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  token: string
  imovelVersaoId: number
}

type Periodo = 'manha' | 'tarde' | 'indiferente'

export function ModalPedidoVisita({ open, onOpenChange, token, imovelVersaoId }: Props) {
  const [data1, setData1] = useState('')
  const [periodo1, setPeriodo1] = useState<Periodo>('indiferente')
  const [data2, setData2] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const criar = useCriarPedido(token)

  async function submeter() {
    if (!data1) return
    setErro(null)
    try {
      await criar.mutateAsync({
        versaoId: imovelVersaoId,
        tipo: 'pedido_visita',
        payload: {
          data1,
          periodo1,
          data2: data2 || null,
          periodo2: 'indiferente',
          mensagem: mensagem || null,
        },
      })
      setData1(''); setData2(''); setMensagem('')
      onOpenChange(false)
    } catch {
      setErro('Não foi possível enviar o pedido. Tenta novamente.')
    }
  }
  // ... resto igual (sem o select de periodo2)

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Pedir visita">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Data preferida *
          </label>
          <input
            type="date"
            value={data1}
            onChange={(e) => setData1(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Período</label>
          <select
            value={periodo1}
            onChange={(e) => setPeriodo1(e.target.value as Periodo)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="indiferente">Indiferente</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Data alternativa (opcional)
          </label>
          <input
            type="date"
            value={data2}
            onChange={(e) => setData2(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Mensagem (opcional)
          </label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={submeter}
            disabled={!data1 || criar.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50"
          >
            {criar.isPending ? 'A enviar…' : 'Enviar pedido'}
          </button>
        </div>
      </div>
    </Modal>
  )
}