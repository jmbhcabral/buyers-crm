import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { useUpdateImovel } from '@/hooks/use-mutations-imovel'
import type { ImovelVersaoComDetalhes } from '@/types'

interface Props {
  imovel: ImovelVersaoComDetalhes
}

export default function FormImovel({ imovel }: Props) {
  const mutation = useUpdateImovel(imovel.id)

  // Inicialização direta — sem useEffect.
  // O pai passa `key={imovel.id}` para forçar remount quando o imóvel muda.
  const [titulo, setTitulo] = useState(imovel.titulo ?? '')
  const [preco, setPreco] = useState(imovel.preco ?? '')
  const [localizacao, setLocalizacao] = useState(
    (imovel.localizacao ?? []).join(', ')
  )
  const [descricao, setDescricao] = useState(imovel.descricao ?? '')
  const [anunciante, setAnunciante] = useState(imovel.anunciante ?? '')
  const [notas, setNotas] = useState(imovel.notas_internas ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({
      titulo: titulo || null,
      preco: preco || null,
      localizacao: localizacao
        ? localizacao.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      descricao: descricao || null,
      anunciante: anunciante || null,
      notas_internas: notas || null,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">A minha versão</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco">Preço</Label>
              <Input
                id="preco"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="€ 350.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anunciante">Anunciante</Label>
              <Input
                id="anunciante"
                value={anunciante}
                onChange={(e) => setAnunciante(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localizacao">Localização</Label>
            <Input
              id="localizacao"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Avenida da Liberdade, Lisboa, Portugal"
            />
            <p className="text-xs text-muted-foreground">
              Separa os componentes por vírgula.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas internas</Label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Notas visíveis só para ti (não aparecem no PDF)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}