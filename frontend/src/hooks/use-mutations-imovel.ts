import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ImovelVersaoComDetalhes } from '@/types'

interface UpdateImovelPayload {
  titulo?: string | null
  preco?: string | null
  localizacao?: string[] | null
  descricao?: string | null
  anunciante?: string | null
  notas_internas?: string | null
}

export function useUpdateImovel(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateImovelPayload) => {
      const { data } = await api.patch<ImovelVersaoComDetalhes>(
        `/imoveis/${versaoId}`,
        payload
      )
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['imovel', versaoId], data)
      qc.invalidateQueries({ queryKey: ['imoveis'] })
    },
  })
}

export function useAssociarCliente(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clienteId: number) => {
      await api.post(`/imoveis/${versaoId}/clientes/${clienteId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imovel', versaoId, 'clientes'] })
      qc.invalidateQueries({ queryKey: ['imoveis'] })
    },
  })
}

export function useDesassociarCliente(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clienteId: number) => {
      await api.delete(`/imoveis/${versaoId}/clientes/${clienteId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imovel', versaoId, 'clientes'] })
      qc.invalidateQueries({ queryKey: ['imoveis'] })
    },
  })
}