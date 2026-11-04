import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ImovelVersaoComDetalhes, PapelAssociacao } from '@/types'

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

interface AssociarClientePayload {
  clienteId: number
  papel: PapelAssociacao
}

export function useAssociarCliente(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clienteId, papel }: AssociarClientePayload) => {
      await api.post(`/imoveis/${versaoId}/clientes/${clienteId}`, null, {
        params: { papel },
      })
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['imovel', versaoId, 'clientes'] })
      qc.invalidateQueries({ queryKey: ['imoveis'] })
      // Backend promove e_comprador / e_vendedor do cliente ao associar.
      // Invalidar a chave ['cliente', id] apanha (por prefix match) o detalhe
      // do cliente e também ['cliente', id, 'imoveis'].
      qc.invalidateQueries({ queryKey: ['cliente', variables.clienteId] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useDesassociarCliente(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clienteId: number) => {
      await api.delete(`/imoveis/${versaoId}/clientes/${clienteId}`)
    },
    onSuccess: (_, clienteId) => {
      qc.invalidateQueries({ queryKey: ['imovel', versaoId, 'clientes'] })
      qc.invalidateQueries({ queryKey: ['imoveis'] })
      // Desassociar NÃO despromove o cliente (additive-only no backend),
      // mas o detalhe do cliente pode mostrar a lista de imóveis dele.
      qc.invalidateQueries({ queryKey: ['cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}