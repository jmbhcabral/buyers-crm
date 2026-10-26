import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ImovelVersaoComDetalhes } from '@/types'

export function useImovel(id: number) {
  return useQuery({
    queryKey: ['imovel', id],
    queryFn: async () => {
      const { data } = await api.get<ImovelVersaoComDetalhes>(`/imoveis/${id}`)
      return data
    },
    enabled: !isNaN(id),
  })
}