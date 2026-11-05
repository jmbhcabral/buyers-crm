import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Cliente, ClienteAssociado } from '@/types'

interface FiltrosClientes {
  q?: string
}

export function useClientes(filtros: FiltrosClientes = {}) {
  return useQuery({
    queryKey: ['clientes', filtros],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtros.q) params.set('q', filtros.q)
      const { data } = await api.get<Cliente[]>(
        `/clientes${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}

export function useClientesDoImovel(versaoId: number) {
  return useQuery({
    queryKey: ['imovel', versaoId, 'clientes'],
    queryFn: async () => {
      const { data } = await api.get<ClienteAssociado[]>(`/imoveis/${versaoId}/clientes`)
      return data
    },
    enabled: !isNaN(versaoId),
  })
}

export function useCriarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      nome: string
      email?: string | null
      telefone?: string | null
      nif?: string | null
      notas?: string | null
      // Visibilidade: null = pessoal, id = cliente partilhado pela equipa.
      // Validado no backend (só a própria equipa).
      equipa_id?: number | null
      // Pelo menos um dos papéis tem de ser true (defaults no backend:
      // e_comprador=true, e_vendedor=false). O backend valida.
      e_comprador?: boolean
      e_vendedor?: boolean
    }) => {
      const { data } = await api.post<Cliente>('/clientes', payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

/** Campos escrevíveis de Cliente (exclui gerados pelo backend e relationship). */
type ClienteUpdatePayload = Partial<
  Omit<Cliente, 'id' | 'qualificacao' | 'criado_em' | 'atualizado_em' | 'posso_editar'>
>

export function useAtualizarCliente(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ClienteUpdatePayload) => {
      const { data } = await api.patch<Cliente>(`/clientes/${clienteId}`, payload)
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['cliente', clienteId], data)
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

export function useApagarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clienteId: number) => {
      await api.delete(`/clientes/${clienteId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}