import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { User } from '@/types'

export function useAtualizarMeuUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { nome?: string; email?: string }) => {
      const { data } = await api.patch<User>('/me', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultor', 'me'] })
    },
  })
}

export function useUploadFotoPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/me/consultor/foto', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultor', 'me'] })
    },
  })
}

export function useApagarFotoPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/me/consultor/foto')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultor', 'me'] })
    },
  })
}