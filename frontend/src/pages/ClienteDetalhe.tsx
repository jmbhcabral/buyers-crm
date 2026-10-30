import { Link, useParams } from 'react-router-dom'
import { useCliente } from '@/hooks/use-cliente'
import { useImoveisDoCliente } from '@/hooks/use-imoveis-do-cliente'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Building2 } from 'lucide-react'
import FormCliente from '@/components/cliente/FormCliente'
import LinkCliente from '@/components/cliente/LinkCliente'
import GestaoImoveisDoLink from '@/components/cliente/GestaoImoveisDoLink'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const clienteId = Number(id)
  const { data: cliente, isLoading, isError } = useCliente(clienteId)
  const { data: imoveis } = useImoveisDoCliente(clienteId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !cliente) {
    return (
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" asChild>
          <Link to="/clientes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Cliente não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link to="/clientes">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{cliente.nome}</h1>
        {cliente.email && (
          <p className="text-muted-foreground">{cliente.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FormCliente key={cliente.id} cliente={cliente} />
        </div>
        <div className="space-y-6">
          <LinkCliente clienteId={clienteId} />
          <GestaoImoveisDoLink
            clienteId={clienteId}
            imoveisAssociados={imoveis ?? []}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Imóveis associados ({imoveis?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!imoveis || imoveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este cliente ainda não está associado a nenhum imóvel.
                </p>
              ) : (
                imoveis.map((imovel) => (
                  <Link
                    key={imovel.id}
                    to={`/imoveis/${imovel.id}`}
                    className="block p-2 border rounded hover:bg-muted/50 transition"
                  >
                    <p className="font-medium text-sm line-clamp-1">
                      {imovel.titulo || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imovel.preco || '—'}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}