import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ConsultorAdminCreate, ConsultorAdminCredenciaisUpdate } from '@/types'

export function useCriarConsultorAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ConsultorAdminCreate) => {
      const { data } = await api.post('/admin/consultores', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'consultores'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useAlterarCredenciaisConsultor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      consultorId,
      payload,
    }: {
      consultorId: number
      payload: ConsultorAdminCredenciaisUpdate
    }) => {
      const { data } = await api.put(
        `/admin/consultores/${consultorId}/credenciais`,
        payload
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'consultores'] })
    },
  })
}