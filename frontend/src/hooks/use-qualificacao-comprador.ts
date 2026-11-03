import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  Cliente,
  QualificacaoComprador,
  QualificacaoCompradorUpsert,
} from '@/types'

const queryKey = (clienteId: number) =>
  ['qualificacao-comprador', clienteId] as const

function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const response = (err as { response?: { status?: number } }).response
  return response?.status === 404
}

export function useQualificacao(clienteId: number) {
  return useQuery({
    queryKey: queryKey(clienteId),
    queryFn: async (): Promise<QualificacaoComprador | null> => {
      try {
        const { data } = await api.get<QualificacaoComprador>(
          `/clientes/${clienteId}/qualificacao-comprador`
        )
        return data
      } catch (err) {
        if (isNotFound(err)) return null
        throw err
      }
    },
    enabled: !isNaN(clienteId),
  })
}

export function useUpsertQualificacao(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: QualificacaoCompradorUpsert) => {
      const { data } = await api.put<QualificacaoComprador>(
        `/clientes/${clienteId}/qualificacao-comprador`,
        payload
      )
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKey(clienteId), data)
      qc.setQueryData<Cliente>(['cliente', clienteId], (old) =>
        old ? { ...old, qualificacao: data } : old
      )
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useApagarQualificacao(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/clientes/${clienteId}/qualificacao-comprador`)
    },
    onSuccess: () => {
      qc.setQueryData(queryKey(clienteId), null)
      qc.setQueryData<Cliente>(['cliente', clienteId], (old) =>
        old ? { ...old, qualificacao: null } : old
      )
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}