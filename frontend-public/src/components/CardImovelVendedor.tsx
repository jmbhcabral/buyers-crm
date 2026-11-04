import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicImovelVendedorItem, VisitanteOrigem } from '../types'
import { EstadoImovelBadge } from './EstadoImovelBadge'
import { useEstatisticasVendedor } from '../hooks/use-estatisticas-vendedor'

interface Props {
  token: string
  imovel: PublicImovelVendedorItem
  fotoUrl?: string
}

type SubTab = 'resumo' | 'visitas'

const ORIGEM_LABEL: Record<VisitanteOrigem, string> = {
  agencia_externa: 'Agência',
  particular: 'Particular',
  cliente_proprio: 'Cliente próprio',
  walk_in: 'Walk-in',
  outro: 'Outro',
}

export function CardImovelVendedor({ token, imovel, fotoUrl }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('resumo')
  const { data: stats, loading, erro } = useEstatisticasVendedor(
    token,
    imovel.imovel_versao_id,
    subTab === 'visitas',
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Topo clicável → detalhe público (agora aceita angariações) */}
      <Link
        to={`/s/${token}/imovel/${imovel.imovel_versao_id}`}
        className="block active:scale-[0.99] transition-transform"
      >
        <div className="aspect-[4/3] bg-gray-100 relative">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={imovel.titulo || 'Imóvel'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              Sem foto
            </div>
          )}
          <EstadoImovelBadge estado={imovel.estado_imovel} />
          {imovel.num_fotos > 0 && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
              {imovel.num_fotos} fotos
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">
            {imovel.titulo || 'Sem título'}
          </h3>
          {imovel.localizacao && imovel.localizacao.length > 0 && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
              📍 {imovel.localizacao.join(', ')}
            </p>
          )}
          {imovel.preco && (
            <p className="text-lg font-bold text-primary mt-2">{imovel.preco}</p>
          )}
        </div>
      </Link>

      <div className="border-t">
        <div className="flex">
          <button
            onClick={() => setSubTab('resumo')}
            className={`flex-1 py-2.5 text-xs font-medium transition ${
              subTab === 'resumo'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 border-b-2 border-transparent'
            }`}
          >
            Resumo
          </button>
          <button
            onClick={() => setSubTab('visitas')}
            className={`flex-1 py-2.5 text-xs font-medium transition ${
              subTab === 'visitas'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 border-b-2 border-transparent'
            }`}
          >
            Visitas ({imovel.num_visitas})
          </button>
        </div>

        {subTab === 'resumo' && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {imovel.num_visitas}
                </p>
                <p className="text-xs text-gray-500">Visitas</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {imovel.rating_global_medio != null
                    ? imovel.rating_global_medio.toFixed(1)
                    : '—'}
                </p>
                <p className="text-xs text-gray-500">Avaliação média</p>
              </div>
            </div>
            {imovel.ultima_visita_em && (
              <p className="text-xs text-gray-500">
                Última visita:{' '}
                {new Date(imovel.ultima_visita_em).toLocaleDateString('pt-PT')}
              </p>
            )}
            {imovel.num_visitas === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                Ainda não há visitas registadas.
              </p>
            )}
          </div>
        )}

        {subTab === 'visitas' && (
          <div className="p-4">
            {loading && (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            )}
            {erro && <p className="text-sm text-red-500">{erro}</p>}
            {stats && stats.visitas.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                Sem visitas registadas.
              </p>
            )}
            {stats && stats.visitas.length > 0 && (
              <>
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">{stats.num_visitas}</span>{' '}
                    {stats.num_visitas === 1 ? 'visita' : 'visitas'} ·{' '}
                    <span className="font-medium">✅ {stats.compraria_sim}</span>{' '}
                    compraria ·{' '}
                    <span className="font-medium">❌ {stats.compraria_nao}</span>{' '}
                    não compraria
                  </p>
                  {stats.rating_global_medio != null && (
                    <p>
                      Avaliação global média:{' '}
                      <span className="font-medium">
                        {stats.rating_global_medio.toFixed(1)}/5
                      </span>
                    </p>
                  )}
                </div>

                <ul className="space-y-4">
                  {stats.visitas.map((v) => (
                    <li key={v.id} className="border-l-2 border-primary/30 pl-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(v.data_visita).toLocaleDateString('pt-PT')}
                        </p>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {ORIGEM_LABEL[v.visitante_origem]}
                        </span>
                      </div>
                      <p className="text-xs mb-2">
                        {v.compraria ? '✅ Compraria' : '❌ Não compraria'}
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mb-2">
                        <span>Áreas: {v.rating_areas}/5</span>
                        <span>Acabamentos: {v.rating_acabamentos}/5</span>
                        <span>Localização: {v.rating_localizacao}/5</span>
                        <span>Apresentação: {v.rating_apresentacao}/5</span>
                        <span>Preço: {v.rating_preco}/5</span>
                        <span className="font-medium">
                          Global: {v.rating_global}/5
                        </span>
                      </div>
                      {v.gostou && (
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">Gostou:</span>{' '}
                          {v.gostou}
                        </p>
                      )}
                      {v.nao_gostou && (
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">Não gostou:</span>{' '}
                          {v.nao_gostou}
                        </p>
                      )}
                      {v.observacoes && (
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">Obs.:</span>{' '}
                          {v.observacoes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}