import { Link, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ImovelDetalhe() {
  const { id } = useParams()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/imoveis">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Link>
      </Button>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium">Detalhe do imóvel #{id}</p>
          <p className="text-sm text-muted-foreground mt-2">
            A implementar no Bloco 4.4.b
          </p>
        </CardContent>
      </Card>
    </div>
  )
}