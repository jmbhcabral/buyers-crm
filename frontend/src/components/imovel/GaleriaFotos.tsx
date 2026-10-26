import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FotoBlob from '@/components/imovel/FotoBlob'
import { Image as ImageIcon } from 'lucide-react'
import type { Foto } from '@/types'

interface Props {
  fotos: Foto[]
  imovelId: number
}

export default function GaleriaFotos({ fotos, imovelId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Galeria ({fotos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fotos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem fotos ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fotos.map((foto) => (
              <a
                key={foto.id}
                href={`/api/imoveis/${imovelId}/fotos/${foto.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square bg-muted rounded overflow-hidden hover:opacity-80 transition-opacity"
              >
                <FotoBlob versaoId={imovelId} fotoId={foto.id} alt={foto.titulo || `Foto ${foto.ordem + 1}`} />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}