import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Clientes() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Lista de clientes a chegar no Bloco 4.5</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Placeholder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui vais gerir os teus clientes e associá-los a imóveis.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}