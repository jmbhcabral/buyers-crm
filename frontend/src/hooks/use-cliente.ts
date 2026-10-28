import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Cliente } from '@/types'

export function useCliente(id: number) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const { data } = await api.get<Cliente>(`/clientes/${id}`)
      return data
    },
    enabled: !isNaN(id),
  })
}