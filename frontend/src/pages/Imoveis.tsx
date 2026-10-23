import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Imoveis() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Imóveis</h1>
        <p className="text-muted-foreground">Lista de imóveis a chegar no Bloco 4.4</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Placeholder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui vais ver os teus imóveis, editar, gerar PDF e associar a clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}