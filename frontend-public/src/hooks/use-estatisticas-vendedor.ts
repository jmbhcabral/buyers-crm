import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import type { EstatisticasVendedor } from '../types'

/**
 * Carrega as estatísticas de um imóvel angariado, on-demand.
 *
 * - Só dispara o fetch quando `enabled=true`.
 * - O resultado (ou o erro) fica em cache local: alternar entre sub-tabs
 *   não refaz o pedido.
 * - `loading` é derivado do estado — não há setState no corpo do efeito
 *   (compatível com `react-hooks/set-state-in-effect`).
 */
export function useEstatisticasVendedor(
  token: string,
  versaoId: number,
  enabled: boolean,
) {
  const [data, setData] = useState<EstatisticasVendedor | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const startedRef = useRef(false)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!enabled || startedRef.current) return
    startedRef.current = true
    completedRef.current = false

    let cancelled = false

    api
      .get<EstatisticasVendedor>(
        `/public/links/${token}/imoveis-vendedor/${versaoId}/estatisticas`,
      )
      .then((r) => {
        if (cancelled) return
        completedRef.current = true
        setData(r.data)
      })
      .catch(() => {
        if (cancelled) return
        completedRef.current = true
        setErro('Não foi possível carregar as visitas.')
      })

    return () => {
      cancelled = true
      // StrictMode: cleanup corre imediatamente após o efeito.
      // Se o fetch foi cancelado antes de terminar (sem data nem erro),
      // permitir nova tentativa no segundo mount.
      if (!completedRef.current) {
        startedRef.current = false
      }
    }
  }, [enabled, token, versaoId])

  // Derivado do estado — sem setState no efeito.
  const loading = enabled && !data && !erro

  return { data, loading, erro }
}