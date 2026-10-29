import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { PdfGerado, PdfGeradoComContexto } from '@/types'

interface FiltrosPdfs {
  q?: string
  imovelId?: number
  clienteId?: number
}

export function usePdfs(filtros: FiltrosPdfs = {}) {
  return useQuery({
    queryKey: ['pdfs', filtros],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filtros.q) params.set('q', filtros.q)
      if (filtros.imovelId) params.set('imovel_id', String(filtros.imovelId))
      if (filtros.clienteId) params.set('cliente_id', String(filtros.clienteId))

      const { data } = await api.get<PdfGeradoComContexto[]>(
        `/pdfs${params.toString() ? `?${params}` : ''}`
      )
      return data
    },
  })
}

export function useGerarPdf(versaoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clienteId: number) => {
      const { data } = await api.post<PdfGerado>(
        `/imoveis/${versaoId}/pdf?cliente_id=${clienteId}`
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdfs'] })
    },
  })
}

export function useApagarPdf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pdfId: number) => {
      await api.delete(`/pdfs/${pdfId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdfs'] })
    },
  })
}

/**
 * Descarrega um PDF com Bearer token (o endpoint requer auth).
 * Abre numa nova aba via Blob URL.
 */
export async function descarregarPdf(pdfId: number, _nomeFicheiro: string) {
  const resp = await fetch(`/api/pdfs/${pdfId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  })

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }

  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)

  // Abre numa nova aba
  window.open(url, '_blank')

  // Liberta depois de um tempo
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}