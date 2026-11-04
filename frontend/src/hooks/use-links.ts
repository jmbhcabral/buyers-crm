import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Link, LinkAnalytics, LinkComDetalhes } from '@/types'

export function useLinks() {
  return useQuery({
    queryKey: ['links'],
    queryFn: async () => {
      const { data } = await api.get<Link[]>('/links')
      return data
    },
  })
}

export function useLinkDoCliente(clienteId: number) {
  return useQuery({
    queryKey: ['links', 'cliente', clienteId],
    queryFn: async () => {
      const { data } = await api.get<LinkComDetalhes | null>(`/links/cliente/${clienteId}`)
      return data
    },
    enabled: !isNaN(clienteId),
  })
}

export function useLink(linkId: number) {
  return useQuery({
    queryKey: ['links', linkId],
    queryFn: async () => {
      const { data } = await api.get<LinkComDetalhes>(`/links/${linkId}`)
      return data
    },
    enabled: !isNaN(linkId),
  })
}

export function useLinkAnalytics(linkId: number) {
  return useQuery({
    queryKey: ['links', linkId, 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<LinkAnalytics>(`/links/${linkId}/analytics`)
      return data
    },
    enabled: !isNaN(linkId),
  })
}

export function useCriarLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      cliente_id: number
      expira_em_dias?: number
      consultor_apresentacao_id?: number | null
    }) => {
      const { data } = await api.post<Link>('/links', payload)
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['links'] })
      qc.invalidateQueries({ queryKey: ['links', 'cliente', data.cliente_id] })
    },
  })
}

export function useRenovarLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: number) => {
      const { data } = await api.patch<Link>(`/links/${linkId}/renovar`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] })
    },
  })
}

export function useRevogarLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: number) => {
      const { data } = await api.patch<Link>(`/links/${linkId}/revogar`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links'] })
    },
  })
}

// NOVO — define o consultor de apresentação no link público.
// Passar `null` faz fallback para o dono do link.
export function useAlterarApresentacaoLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      linkId,
      consultorApresentacaoId,
    }: {
      linkId: number
      consultorApresentacaoId: number | null
    }) => {
      const { data } = await api.patch<Link>(`/links/${linkId}/apresentacao`, {
        consultor_apresentacao_id: consultorApresentacaoId,
      })
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['links'] })
      qc.invalidateQueries({ queryKey: ['links', data.id] })
      qc.invalidateQueries({ queryKey: ['links', 'cliente', data.cliente_id] })
    },
  })
}

export function useAdicionarImovelAoLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ linkId, versaoId }: { linkId: number; versaoId: number }) => {
      await api.post(`/links/${linkId}/imoveis`, { imovel_versao_id: versaoId })
    },
    onSuccess: (_, { linkId }) => {
      qc.invalidateQueries({ queryKey: ['links', linkId] })
      qc.invalidateQueries({ queryKey: ['links', 'cliente'] })
      qc.invalidateQueries({ queryKey: ['links'] })
    },
  })
}

export function useRemoverImovelDoLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ linkId, versaoId }: { linkId: number; versaoId: number }) => {
      await api.delete(`/links/${linkId}/imoveis/${versaoId}`)
    },
    onSuccess: (_, { linkId }) => {
      qc.invalidateQueries({ queryKey: ['links', linkId] })
      qc.invalidateQueries({ queryKey: ['links', 'cliente'] })
      qc.invalidateQueries({ queryKey: ['links'] })
    },
  })
}