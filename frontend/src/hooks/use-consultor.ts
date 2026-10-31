import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Consultor } from '@/types'

export function useMeuConsultor() {
  return useQuery({
    queryKey: ['consultor', 'me'],
    queryFn: async () => {
      const { data } = await api.get<Consultor>('/me/consultor')
      return data
    },
  })
}

export function useAtualizarConsultor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      telefone?: string | null
      nif?: string | null
      bio?: string | null
      agencia?: string | null 
    }) => {
      const { data } = await api.patch<Consultor>('/me/consultor', payload)
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['consultor', 'me'], data)
    },
  })
}