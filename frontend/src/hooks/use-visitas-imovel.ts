import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  VisitaImovel,
  VisitaImovelCreate,
  VisitaImovelUpdate,
} from '@/types'

const key = (versaoId: number) => ['visitas-imovel', versaoId] as const

export function useVisitasImovel(versaoId: number) {
  return useQuery({
    queryKey: key(versaoId),
    queryFn: async () => {
      const { data } = await api.get<VisitaImovel[]>(
        `/imoveis/${versaoId}/visitas`,
      )
      return data
    },
    enabled: !isNaN(versaoId) && versaoId > 0,
  })
}

export function useCriarVisita(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VisitaImovelCreate) => {
      const { data } = await api.post<VisitaImovel>(
        `/imoveis/${versaoId}/visitas`,
        payload,
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(versaoId) })
    },
  })
}

export function useAtualizarVisita(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: VisitaImovelUpdate
    }) => {
      const { data } = await api.patch<VisitaImovel>(`/visitas/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(versaoId) })
    },
  })
}

export function useApagarVisita(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/visitas/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(versaoId) })
    },
  })
}