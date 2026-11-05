import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import type { Interacao, InteracoesResumo, Nota } from '../types'

// ---------------------------------------------------------------------------
// Cache + pub-sub simples (substitui react-query neste projeto minimal)
// ---------------------------------------------------------------------------

type Listener = () => void

interface Entry<T> {
  data: T | null
  loading: boolean
  erro: string | null
  inflight: Promise<void> | null
  listeners: Set<Listener>
}

function makeEntry<T>(): Entry<T> {
  return { data: null, loading: false, erro: null, inflight: null, listeners: new Set() }
}

function emit<T>(e: Entry<T>) {
  e.listeners.forEach((fn) => fn())
}

// ---------------------------------------------------------------------------
// Resumo (interesses / pedidos / notas_nao_lidas) — cache por token
// ---------------------------------------------------------------------------
const resumoCache = new Map<string, Entry<InteracoesResumo>>()

function getResumo(token: string): Entry<InteracoesResumo> {
  let e = resumoCache.get(token)
  if (!e) {
    e = makeEntry<InteracoesResumo>()
    resumoCache.set(token, e)
  }
  return e
}

function fetchResumo(token: string): Promise<void> {
  const e = getResumo(token)
  if (e.inflight) return e.inflight
  e.loading = true
  e.erro = null
  emit(e)
  e.inflight = api
    .get<InteracoesResumo>(`/public/links/${token}/interacoes`)
    .then((r) => {
      e.data = r.data
    })
    .catch(() => {
      e.erro = 'Não foi possível carregar interações.'
    })
    .finally(() => {
      e.loading = false
      e.inflight = null
      emit(e)
    })
  return e.inflight
}

export function useInteracoesPublico(token: string) {
  const [, forceUpdate] = useState(0)
  const entry = getResumo(token)

  useEffect(() => {
    const fn = () => forceUpdate((x) => x + 1)
    entry.listeners.add(fn)
    if (entry.data === null && !entry.loading) fetchResumo(token)
    return () => {
      entry.listeners.delete(fn)
    }
  }, [token, entry])

  return { data: entry.data, loading: entry.loading, erro: entry.erro }
}

// ---------------------------------------------------------------------------
// Toggle interesse
// ---------------------------------------------------------------------------
export function useToggleInteresse(token: string) {
  const [isPending, setPending] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mutate = useCallback(
    async (args: { versaoId: number; ativo: boolean }) => {
      const e = getResumo(token)
      const anterior = e.data
      if (e.data) {
        e.data = {
          ...e.data,
          interesses: args.ativo
            ? Array.from(new Set([...e.data.interesses, args.versaoId]))
            : e.data.interesses.filter((id) => id !== args.versaoId),
        }
        emit(e)
      }
      setPending(true)
      setErro(null)
      try {
        await api.put(
          `/public/links/${token}/imoveis/${args.versaoId}/interesse`,
          { ativo: args.ativo }
        )
      } catch (err) {
        e.data = anterior
        emit(e)
        setErro('Não foi possível atualizar o interesse.')
        throw err
      } finally {
        setPending(false)
      }
    },
    [token]
  )

  return { mutate, mutateAsync: mutate, isPending, erro }
}

// ---------------------------------------------------------------------------
// Criar pedido (visita / info)
// ---------------------------------------------------------------------------
export function useCriarPedido(token: string) {
  const [isPending, setPending] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mutate = useCallback(
    async (args: {
      versaoId: number
      tipo: 'pedido_visita' | 'pedido_info'
      payload: Record<string, unknown>
    }) => {
      setPending(true)
      setErro(null)
      try {
        const { data } = await api.post<Interacao>(
          `/public/links/${token}/imoveis/${args.versaoId}/pedidos`,
          { tipo: args.tipo, payload: args.payload }
        )
        await fetchResumo(token)
        return data
      } catch (err) {
        setErro('Não foi possível enviar o pedido.')
        throw err
      } finally {
        setPending(false)
      }
    },
    [token]
  )

  return { mutate, mutateAsync: mutate, isPending, erro }
}

// ---------------------------------------------------------------------------
// Cancelar pedido
// ---------------------------------------------------------------------------
export function useCancelarPedido(token: string) {
  const [isPending, setPending] = useState(false)
  const mutate = useCallback(
    async (interacaoId: number) => {
      setPending(true)
      try {
        await api.delete(`/public/links/${token}/interacoes/${interacaoId}`)
        await fetchResumo(token)
      } finally {
        setPending(false)
      }
    },
    [token]
  )
  return { mutate, mutateAsync: mutate, isPending }
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------
const notasCache = new Map<string, Entry<Nota[]>>()

function notasKey(token: string, versaoId?: number) {
  return `${token}:${versaoId ?? 'all'}`
}

function getNotas(token: string, versaoId?: number): Entry<Nota[]> {
  const k = notasKey(token, versaoId)
  let e = notasCache.get(k)
  if (!e) {
    e = makeEntry<Nota[]>()
    notasCache.set(k, e)
  }
  return e
}

function fetchNotas(token: string, versaoId?: number): Promise<void> {
  const e = getNotas(token, versaoId)
  if (e.inflight) return e.inflight
  e.loading = true
  e.erro = null
  emit(e)
  const qs = versaoId ? `?imovel_versao_id=${versaoId}` : ''
  e.inflight = api
    .get<Nota[]>(`/public/links/${token}/notas${qs}`)
    .then((r) => {
      e.data = r.data
    })
    .catch(() => {
      e.erro = 'Não foi possível carregar notas.'
    })
    .finally(() => {
      e.loading = false
      e.inflight = null
      emit(e)
    })
  return e.inflight
}

export function useNotasPublicas(token: string, versaoId?: number) {
  const [, forceUpdate] = useState(0)
  const entry = getNotas(token, versaoId)

  useEffect(() => {
    const fn = () => forceUpdate((x) => x + 1)
    entry.listeners.add(fn)
    if (entry.data === null && !entry.loading) fetchNotas(token, versaoId)
    return () => {
      entry.listeners.delete(fn)
    }
  }, [token, versaoId, entry])

  return { data: entry.data, loading: entry.loading, erro: entry.erro }
}

export function useCriarNotaPublica(token: string) {
  const [isPending, setPending] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mutate = useCallback(
    async (args: { imovelVersaoId: number | null; conteudo: string }) => {
      setPending(true)
      setErro(null)
      try {
        const { data } = await api.post<Nota>(`/public/links/${token}/notas`, {
          imovel_versao_id: args.imovelVersaoId,
          conteudo: args.conteudo,
        })
        await fetchNotas(token, args.imovelVersaoId ?? undefined)
        await fetchResumo(token)
        return data
      } catch (err) {
        setErro('Não foi possível enviar a nota.')
        throw err
      } finally {
        setPending(false)
      }
    },
    [token]
  )

  return { mutate, mutateAsync: mutate, isPending, erro }
}

export function useMarcarNotaLidaPublica(token: string) {
  const mutate = useCallback(
    async (notaId: number) => {
      await api.patch(`/public/links/${token}/notas/${notaId}/ler`)
      // Actualizar o agregado (por_imovel[].notas_nao_lidas) para o
      // badge do AcoesImovel desaparecer sem precisar de refresh.
      await fetchResumo(token)
    },
    [token]
  )
  return { mutate, mutateAsync: mutate }
}