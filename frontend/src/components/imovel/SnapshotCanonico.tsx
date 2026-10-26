import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import type { ImovelCanonico } from '@/types'

interface Props {
  canonico: ImovelCanonico
}

export default function SnapshotCanonico({ canonico }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Snapshot do Idealista
          <Badge variant="outline" className="text-xs">
            só leitura
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {canonico.url && (
          <a
            href={canonico.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 text-xs"
          >
            Ver no Idealista
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <Campo label="ID" valor={canonico.property_id} />
        <Campo label="Título" valor={canonico.titulo} />
        <Campo label="Preço" valor={canonico.preco} />
        <Campo
          label="Localização"
          valor={canonico.localizacao?.join(', ')}
        />
        <Campo label="Anunciante" valor={canonico.anunciante} />
        <Campo label="Referência" valor={canonico.referencia_anunciante} />

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Capturado em{' '}
            {new Date(canonico.extraido_em).toLocaleString('pt-PT')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function Campo({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words">{valor}</p>
    </div>
  )
}