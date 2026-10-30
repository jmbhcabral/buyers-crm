import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../lib/api'
import type { PublicImovelDetalhe } from '../types'
import { Layout } from '../components/Layout'

export function DetalhePage() {
  const { token, versaoId } = useParams<{ token: string; versaoId: string }>()
  const [data, setData] = useState<PublicImovelDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!token || !versaoId) return
    setLoading(true)
    setErro(null)
    api
      .get<PublicImovelDetalhe>(`/public/links/${token}/imoveis/${versaoId}`)
      .then((r) => setData(r.data))
      .catch((e) => {
        const status = e?.response?.status
        if (status === 410) setErro('Este link já não está ativo.')
        else if (status === 404) setErro('Imóvel não encontrado.')
        else setErro('Não foi possível carregar o imóvel.')
      })
      .finally(() => setLoading(false))
  }, [token, versaoId])

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </Layout>
    )
  }

  if (erro || !data) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-900">{erro || 'Erro'}</h2>
          <Link to={`/s/${token}`} className="inline-block mt-4 text-primary font-medium">
            ← Voltar à lista
          </Link>
        </div>
      </Layout>
    )
  }

  const fotos = data.fotos
  const fotoAtual = fotos[fotoAtiva]

  return (
    <Layout>
      <Link
        to={`/s/${token}`}
        className="inline-flex items-center text-sm text-primary font-medium mb-4"
      >
        ← Voltar
      </Link>

      {/* Galeria */}
      {fotos.length > 0 && (
        <div className="mb-4">
          <div
            className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden cursor-zoom-in"
            onClick={() => setLightbox(true)}
          >
            <img
              src={fotoAtual.url}
              alt={fotoAtual.titulo || 'Foto'}
              className="w-full h-full object-cover"
            />
          </div>
          {fotos.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {fotos.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setFotoAtiva(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                    i === fotoAtiva ? 'border-primary' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {data.titulo || 'Sem título'}
        </h1>
        {data.localizacao && data.localizacao.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            📍 {data.localizacao.join(', ')}
          </p>
        )}
        {data.preco && (
          <p className="text-2xl font-bold text-primary mt-3">{data.preco}</p>
        )}
        {data.anunciante && (
          <p className="text-xs text-gray-400 mt-2">Anunciante: {data.anunciante}</p>
        )}
      </div>

      {/* Características */}
      {data.caracteristicas && data.caracteristicas.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Características principais
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {data.caracteristicas
              .filter((c) => c.nome !== 'PRICE')
              .map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-base font-bold text-primary">
                    {c.valor}
                    {c.subtexto && <span className="text-xs font-normal text-gray-500"> {c.subtexto}</span>}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Descrição */}
      {data.descricao && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Descrição</h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {data.descricao}
          </div>
        </div>
      )}

      {/* Características específicas */}
      {data.caracteristicas_especificas && data.caracteristicas_especificas.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mt-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Detalhes
          </h2>
          <ul className="space-y-1.5">
            {data.caracteristicas_especificas.map((c, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-primary">•</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && fotoAtual && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={fotoAtual.url}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
          {fotos.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white text-4xl"
                onClick={(e) => {
                  e.stopPropagation()
                  setFotoAtiva((i) => (i - 1 + fotos.length) % fotos.length)
                }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 text-white text-4xl"
                onClick={(e) => {
                  e.stopPropagation()
                  setFotoAtiva((i) => (i + 1) % fotos.length)
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </Layout>
  )
}