import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Perfil() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">Dados do consultor + gestão de API keys (Bloco 4.6)</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Placeholder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui podes editar o teu telefone, bio e gerar API keys para o userscript.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}