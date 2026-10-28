import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DashboardStats, ImovelRecente, PdfRecente } from '@/types'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard/stats')
      return data
    },
  })
}

export function useImoveisRecentes(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'imoveis-recentes', limit],
    queryFn: async () => {
      const { data } = await api.get<ImovelRecente[]>(
        `/dashboard/imoveis-recentes?limit=${limit}`
      )
      return data
    },
  })
}

export function usePdfsRecentes(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'pdfs-recentes', limit],
    queryFn: async () => {
      const { data } = await api.get<PdfRecente[]>(
        `/dashboard/pdfs-recentes?limit=${limit}`
      )
      return data
    },
  })
}