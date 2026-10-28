import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  AdminCanonico,
  AdminConsultor,
  AdminHistorico,
  AdminPdf,
  AdminStats,
  AdminVersao,
} from '@/types'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/admin/stats')
      return data
    },
  })
}

export function useAdminConsultores() {
  return useQuery({
    queryKey: ['admin', 'consultores'],
    queryFn: async () => {
      const { data } = await api.get<AdminConsultor[]>('/admin/consultores')
      return data
    },
  })
}

export function useAdminCanonicos(q?: string) {
  return useQuery({
    queryKey: ['admin', 'canonicos', q],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      const { data } = await api.get<AdminCanonico[]>(
        `/admin/canonicos${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}

export function useAdminVersoes(consultorId?: number, q?: string) {
  return useQuery({
    queryKey: ['admin', 'versoes', consultorId, q],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (consultorId) params.set('consultor_id', String(consultorId))
      if (q) params.set('q', q)
      const { data } = await api.get<AdminVersao[]>(
        `/admin/versoes${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}

export function useAdminHistorico(imovelCanonicoId?: number) {
  return useQuery({
    queryKey: ['admin', 'historico', imovelCanonicoId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (imovelCanonicoId) params.set('imovel_canonico_id', String(imovelCanonicoId))
      const { data } = await api.get<AdminHistorico[]>(
        `/admin/historico${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}

export function useAdminPdfs(consultorId?: number) {
  return useQuery({
    queryKey: ['admin', 'pdfs', consultorId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (consultorId) params.set('consultor_id', String(consultorId))
      const { data } = await api.get<AdminPdf[]>(
        `/admin/pdfs${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}