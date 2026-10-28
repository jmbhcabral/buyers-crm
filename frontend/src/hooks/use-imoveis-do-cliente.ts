import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ImovelVersaoListItem } from '@/types'

export function useImoveisDoCliente(clienteId: number) {
  return useQuery({
    queryKey: ['cliente', clienteId, 'imoveis'],
    queryFn: async () => {
      const { data } = await api.get<ImovelVersaoListItem[]>(
        `/clientes/${clienteId}/imoveis`
      )
      return data
    },
    enabled: !isNaN(clienteId),
  })
}