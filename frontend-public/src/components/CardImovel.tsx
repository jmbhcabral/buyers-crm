import { Link } from 'react-router-dom'
import type { PublicImovelItem } from '../types'

interface Props {
  token: string
  imovel: PublicImovelItem
  fotoUrl?: string
}

export function CardImovel({ token, imovel, fotoUrl }: Props) {
  return (
    <Link
      to={`/s/${token}/imovel/${imovel.imovel_versao_id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99]"
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
  )
}