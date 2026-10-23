import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ImovelVersaoListItem } from '@/types'

interface FiltrosImoveis {
  q?: string
  apenasComConflitos?: boolean
}

export function useImoveis(filtros: FiltrosImoveis = {}) {
  return useQuery({
    queryKey: ['imoveis', filtros],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtros.q) params.set('q', filtros.q)
      if (filtros.apenasComConflitos) params.set('apenas_com_conflitos', 'true')

      const { data } = await api.get<ImovelVersaoListItem[]>(
        `/imoveis${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}