import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import type { PublicLinkResponse } from '../types'
import { Layout } from '../components/Layout'
import { CardImovel } from '../components/CardImovel'

export function ListaPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicLinkResponse | null>(null)
  const [loading, setLoading] = useState(true)   // initializer: começa em loading
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    api
      .get<PublicLinkResponse>(`/public/links/${token}`)
      .then((r) => {
        if (!cancelled) setData(r.data)
      })
      .catch((e) => {
        if (cancelled) return
        const status = e?.response?.status
        const detail = e?.response?.data?.detail
        if (status === 410) setErro(detail || 'Este link já não está ativo.')
        else if (status === 404) setErro('Link inválido.')
        else setErro('Não foi possível carregar os imóveis.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const consultor = data?.consultor ?? null

  if (loading) {
    return (
      <Layout consultor={consultor}>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-gray-500 mt-4 text-sm">A carregar...</p>
        </div>
      </Layout>
    )
  }

  if (erro) {
    return (
      <Layout consultor={consultor}>
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-900">{erro}</h2>
          <p className="text-sm text-gray-500 mt-2">
            Contacte o seu consultor para obter um novo link.
          </p>
        </div>
      </Layout>
    )
  }

  if (!data || data.imoveis.length === 0) {
    return (
      <Layout consultor={consultor}>
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏠</div>
          <h2 className="text-lg font-semibold text-gray-900">
            Ainda não há imóveis nesta seleção
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            O seu consultor está a preparar sugestões.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout consultor={consultor}>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Olá,{' '}
          <span className="font-medium">{data.link.cliente_nome_mascarado}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {data.imoveis.length}{' '}
          {data.imoveis.length === 1 ? 'imóvel selecionado' : 'imóveis selecionados'}
        </p>
      </div>
      <div className="space-y-4">
        {data.imoveis.map((imovel) => (
          <CardImovel
            key={imovel.imovel_versao_id}
            token={token!}
            imovel={imovel}
            fotoUrl={imovel.primeira_foto_url ?? undefined}
          />
        ))}
      </div>
    </Layout>
  )
}