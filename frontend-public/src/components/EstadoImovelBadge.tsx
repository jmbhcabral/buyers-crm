import type { EstadoImovel } from '../types'

const MAP: Record<EstadoImovel, { label: string; cls: string }> = {
  disponivel:        { label: 'Disponível',        cls: 'bg-green-600 text-white' },
  reservado:         { label: 'Reservado',         cls: 'bg-amber-500 text-white' },
  cpcv:              { label: 'CPCV',              cls: 'bg-amber-600 text-white' },
  escritura_marcada: { label: 'Escritura marcada', cls: 'bg-amber-700 text-white' },
  vendido:           { label: 'Vendido',           cls: 'bg-gray-600 text-white' },
  saiu_mercado:      { label: 'Indisponível',      cls: 'bg-gray-500 text-white' },
}

interface Props {
  estado: EstadoImovel
  /** Se `true`, não aplica posicionamento absoluto (para uso inline). */
  inline?: boolean
}

export function EstadoImovelBadge({ estado, inline = false }: Props) {
  const m = MAP[estado] ?? MAP.disponivel
  const base = `text-xs font-semibold px-2 py-0.5 rounded shadow ${m.cls}`
  return (
    <span className={inline ? base : `absolute top-2 left-2 ${base}`}>
      {m.label}
    </span>
  )
}