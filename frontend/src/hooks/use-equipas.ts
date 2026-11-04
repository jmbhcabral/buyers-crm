import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  Equipa,
  EquipaComMembros,
  EquipaCreate,
  EquipaUpdate,
} from '@/types'
import { useAuth } from '@/lib/use-auth'

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export function useAdminEquipas() {
  return useQuery<Equipa[]>({
    queryKey: ['admin', 'equipas'],
    queryFn: async () => {
      const { data } = await api.get('/admin/equipas')
      return data
    },
  })
}

export function useEquipa(id: number | null | undefined) {
  return useQuery<EquipaComMembros>({
    queryKey: ['admin', 'equipas', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/equipas/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCriarEquipa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EquipaCreate): Promise<EquipaComMembros> => {
      const { data } = await api.post('/admin/equipas', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipas'] })
    },
  })
}

export function useAtualizarEquipa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EquipaUpdate }) => {
      const { data } = await api.patch(`/admin/equipas/${id}`, payload)
      return data as Equipa
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipas'] })
      qc.invalidateQueries({ queryKey: ['admin', 'equipas', id] })
    },
  })
}

export function useApagarEquipa() {
  const qc = useQueryClient()
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/equipas/${id}`)
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipas'] })
      qc.invalidateQueries({ queryKey: ['consultores'] })
      // Se o utilizador pertencia à equipa apagada, o seu equipa_id
      // passa a NULL. refreshUser() sincroniza o contexto.
      try { await refreshUser() } catch { /* ignora */ }
    },
  })
}

export function useAdicionarMembro() {
  const qc = useQueryClient()
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async ({ equipaId, consultorId }: { equipaId: number; consultorId: number }) => {
      await api.post(`/admin/equipas/${equipaId}/consultores/${consultorId}`)
    },
    onSuccess: async (_, { equipaId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipas'] })
      qc.invalidateQueries({ queryKey: ['admin', 'equipas', equipaId] })
      qc.invalidateQueries({ queryKey: ['consultores'] })
      // Se o consultor movido for o próprio admin, atualiza o contexto.
      try { await refreshUser() } catch { /* ignora */ }
    },
  })
}

export function useRemoverMembro() {
  const qc = useQueryClient()
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async ({ equipaId, consultorId }: { equipaId: number; consultorId: number }) => {
      await api.delete(`/admin/equipas/${equipaId}/consultores/${consultorId}`)
    },
    onSuccess: async (_, { equipaId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipas'] })
      qc.invalidateQueries({ queryKey: ['admin', 'equipas', equipaId] })
      qc.invalidateQueries({ queryKey: ['consultores'] })
      try { await refreshUser() } catch { /* ignora */ }
    },
  })
}

// ---------------------------------------------------------------------------
// Selector: equipas a que o utilizador pode atribuir um cliente
// ---------------------------------------------------------------------------
export interface EquipasDisponiveis {
  isAdmin: boolean
  minhaEquipaId: number | null
  equipas: Equipa[]
  carregando: boolean
}

export function useEquipasDisponiveis(): EquipasDisponiveis {
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false
  const minhaEquipaId = user?.consultor?.equipa_id ?? null

  const { data: equipasAdmin, isLoading } = useQuery<Equipa[]>({
    queryKey: ['admin', 'equipas'],
    queryFn: async () => {
      const { data } = await api.get('/admin/equipas')
      return data
    },
    enabled: isAdmin,
  })

  if (isAdmin) {
    return {
      isAdmin: true,
      minhaEquipaId: null,
      equipas: equipasAdmin ?? [],
      carregando: isLoading,
    }
  }

  // Não-admin: só conhece a própria equipa (id), sem nome.
  return {
    isAdmin: false,
    minhaEquipaId,
    equipas: [],
    carregando: false,
  }
}