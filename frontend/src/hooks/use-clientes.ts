import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Cliente, ClienteAssociado } from '@/types'

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await api.get<Cliente[]>('/clientes')
      return data
    },
  })
}

export function useClientesDoImovel(versaoId: number) {
  return useQuery({
    queryKey: ['imovel', versaoId, 'clientes'],
    queryFn: async () => {
      const { data } = await api.get<ClienteAssociado[]>(`/imoveis/${versaoId}/clientes`)
      return data
    },
    enabled: !isNaN(versaoId),
  })
}