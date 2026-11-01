import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type {
  EstadoImovel,
  EstadoInteracao,
  InteracaoComContexto,
  NotaComContexto,
  Nota,
} from '@/types'

// --- Cliente ---
export function useInteracoesCliente(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['interacoes', 'cliente', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data } = await api.get<InteracaoComContexto[]>(
        `/clientes/${clienteId}/interacoes`
      )
      return data
    },
  })
}

export function useNotasCliente(
  clienteId: number | undefined,
  imovelVersaoId?: number
) {
  return useQuery({
    queryKey: ['notas', 'cliente', clienteId, imovelVersaoId ?? 'all'],
    enabled: !!clienteId,
    queryFn: async () => {
      const qs = imovelVersaoId ? `?imovel_versao_id=${imovelVersaoId}` : ''
      const { data } = await api.get<NotaComContexto[]>(
        `/clientes/${clienteId}/notas${qs}`
      )
      return data
    },
  })
}

export function useCriarNotaCliente(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { imovelVersaoId?: number | null; conteudo: string }) => {
      const { data } = await api.post<Nota>(`/clientes/${clienteId}/notas`, {
        imovel_versao_id: args.imovelVersaoId ?? null,
        conteudo: args.conteudo,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas', 'cliente', clienteId] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'interacoes-pendentes'] })
    },
  })
}

// --- Imóvel ---
export function useInteracoesImovel(versaoId: number | undefined) {
  return useQuery({
    queryKey: ['interacoes', 'imovel', versaoId],
    enabled: !!versaoId,
    queryFn: async () => {
      const { data } = await api.get<InteracaoComContexto[]>(
        `/imoveis/${versaoId}/interacoes`
      )
      return data
    },
  })
}

export function useNotasImovel(versaoId: number | undefined) {
  return useQuery({
    queryKey: ['notas', 'imovel', versaoId],
    enabled: !!versaoId,
    queryFn: async () => {
      const { data } = await api.get<NotaComContexto[]>(
        `/imoveis/${versaoId}/notas`
      )
      return data
    },
  })
}

// --- Ações genéricas ---
export function useAtualizarInteracao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: number; estado: EstadoInteracao }) => {
      const { data } = await api.patch(`/interacoes/${args.id}`, {
        estado: args.estado,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interacoes'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'interacoes-pendentes'] })
    },
  })
}

export function useMarcarNotaLida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notaId: number) => {
      await api.patch(`/notas/${notaId}/ler`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'interacoes-pendentes'] })
    },
  })
}

export function useAtualizarEstadoImovel(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (estado: EstadoImovel) => {
      await api.patch(`/imoveis/${versaoId}/estado`, { estado_imovel: estado })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imoveis', versaoId] })
      qc.invalidateQueries({ queryKey: ['imoveis'] })
    },
  })
}