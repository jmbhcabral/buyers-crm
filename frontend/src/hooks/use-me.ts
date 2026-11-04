import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/lib/use-auth'
import type { User } from '@/types'

export function useAtualizarMeuUser() {
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async (payload: { nome?: string; email?: string }) => {
      const { data } = await api.patch<User>('/me', payload)
      return data
    },
    onSuccess: async () => {
      await refreshUser()
    },
  })
}

export function useUploadFotoPerfil() {
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/me/consultor/foto', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: async () => {
      await refreshUser()
    },
  })
}

export function useApagarFotoPerfil() {
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/me/consultor/foto')
    },
    onSuccess: async () => {
      await refreshUser()
    },
  })
}

export function useAlterarMinhaPassword() {
  return useMutation({
    mutationFn: async (payload: {
      current_password: string
      new_password: string
    }) => {
      await api.put('/me/password', payload)
    },
  })
}