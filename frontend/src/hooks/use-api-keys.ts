import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiKey, ApiKeyCreated } from '@/types'

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data } = await api.get<ApiKey[]>('/me/api-keys')
      return data
    },
  })
}

export function useCriarApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data } = await api.post<ApiKeyCreated>('/me/api-keys', { nome })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export function useRevogarApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (apiKeyId: number) => {
      await api.delete(`/me/api-keys/${apiKeyId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}