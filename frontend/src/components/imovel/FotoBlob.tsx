import { useFotoBlob } from '@/hooks/use-foto-blob'
import { ImageIcon } from 'lucide-react'

interface Props {
  versaoId: number
  fotoId: number
  alt?: string
}

export default function FotoBlob({ versaoId, fotoId, alt }: Props) {
  const url = useFotoBlob(versaoId, fotoId)

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return <img src={url} alt={alt || ''} className="w-full h-full object-cover" />
}