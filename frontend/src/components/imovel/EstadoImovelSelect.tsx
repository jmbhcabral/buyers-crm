import { useAtualizarEstadoImovel } from '@/hooks/use-interacoes-crm'
import type { EstadoImovel } from '@/types'

const OPCOES: { value: EstadoImovel; label: string; cls: string }[] = [
  { value: 'disponivel',        label: 'Disponível',        cls: 'bg-green-100 text-green-800' },
  { value: 'reservado',         label: 'Reservado',         cls: 'bg-amber-100 text-amber-800' },
  { value: 'cpcv',              label: 'CPCV',              cls: 'bg-amber-200 text-amber-900' },
  { value: 'escritura_marcada', label: 'Escritura marcada', cls: 'bg-orange-200 text-orange-900' },
  { value: 'vendido',           label: 'Vendido',           cls: 'bg-gray-200 text-gray-800' },
  { value: 'saiu_mercado',      label: 'Saiu de mercado',   cls: 'bg-gray-300 text-gray-800' },
]

interface Props {
  versaoId: number
  estado: EstadoImovel
}

export function EstadoImovelSelect({ versaoId, estado }: Props) {
  const mut = useAtualizarEstadoImovel(versaoId)
  const atual = OPCOES.find((o) => o.value === estado) ?? OPCOES[0]

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded ${atual.cls}`}
      >
        {atual.label}
      </span>
      <select
        value={estado}
        disabled={mut.isPending}
        onChange={(e) => mut.mutate(e.target.value as EstadoImovel)}
        className="text-sm border rounded-lg px-2 py-1 bg-white"
      >
        {OPCOES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}