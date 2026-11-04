import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import type { PublicLinkResponse } from '../types'
import { Layout } from '../components/Layout'
import { CardImovel } from '../components/CardImovel'
import { CardImovelVendedor } from '../components/CardImovelVendedor'

type Tab = 'comprador' | 'vendedor'

export function ListaPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PublicLinkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab | null>(null)

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

  if (!data) return null

  const showComprador = data.link.e_comprador
  const showVendedor = data.link.e_vendedor
  const isBoth = showComprador && showVendedor

  // Default: comprador se existir, senão vendedor.
  const activeTab: Tab =
    tab ??
    (showComprador ? 'comprador' : showVendedor ? 'vendedor' : 'comprador')

  return (
    <Layout consultor={consultor}>
      {isBoth && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setTab('comprador')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'comprador'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Imóveis
          </button>
          <button
            onClick={() => setTab('vendedor')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'vendedor'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Meus Imóveis
          </button>
        </div>
      )}

      {activeTab === 'comprador' && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Olá,{' '}
              <span className="font-medium">
                {data.link.cliente_nome_mascarado}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.imoveis.length}{' '}
              {data.imoveis.length === 1
                ? 'imóvel selecionado'
                : 'imóveis selecionados'}
            </p>
          </div>
          {data.imoveis.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏠</div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ainda não há imóveis nesta seleção
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                O seu consultor está a preparar sugestões.
              </p>
            </div>
          ) : (
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
          )}
        </>
      )}

      {activeTab === 'vendedor' && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Olá,{' '}
              <span className="font-medium">
                {data.link.cliente_nome_mascarado}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.imoveis_vendedor.length}{' '}
              {data.imoveis_vendedor.length === 1
                ? 'imóvel angariado'
                : 'imóveis angariados'}
            </p>
          </div>
          {data.imoveis_vendedor.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-lg font-semibold text-gray-900">
                Ainda não tem imóveis angariados
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Quando um imóvel seu estiver a ser gerido pelo consultor,
                aparece aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.imoveis_vendedor.map((imovel) => (
                <CardImovelVendedor
                  key={imovel.imovel_versao_id}
                  token={token!}
                  imovel={imovel}
                  fotoUrl={imovel.primeira_foto_url ?? undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}