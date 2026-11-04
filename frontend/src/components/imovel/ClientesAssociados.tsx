import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus, X, Users } from 'lucide-react'
import {
  useClientes,
  useClientesDoImovel,
} from '@/hooks/use-clientes'
import {
  useAssociarCliente,
  useDesassociarCliente,
} from '@/hooks/use-mutations-imovel'
import type { PapelAssociacao } from '@/types'

interface Props {
  versaoId: number
}

export default function ClientesAssociados({ versaoId }: Props) {
  const { data: associados, isLoading } = useClientesDoImovel(versaoId)
  const { data: todos } = useClientes()
  const associar = useAssociarCliente(versaoId)
  const desassociar = useDesassociarCliente(versaoId)

  const [clienteSelecionado, setClienteSelecionado] = useState<string>('')
  const [papelSelecionado, setPapelSelecionado] =
    useState<PapelAssociacao>('comprador')

  const idsAssociados = new Set((associados ?? []).map((c) => c.id))
  const disponiveis = (todos ?? []).filter((c) => !idsAssociados.has(c.id))

  const contagem = useMemo(() => {
    const lista = associados ?? []
    return {
      total: lista.length,
      compradores: lista.filter((c) => c.papel === 'comprador').length,
      vendedores: lista.filter((c) => c.papel === 'vendedor').length,
    }
  }, [associados])

  function handleAssociar() {
    if (!clienteSelecionado) return
    associar.mutate(
      { clienteId: Number(clienteSelecionado), papel: papelSelecionado },
      {
        onSuccess: () => {
          setClienteSelecionado('')
          setPapelSelecionado('comprador')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clientes associados ({contagem.total})
        </CardTitle>
        {contagem.total > 0 && (
          <p className="text-xs text-muted-foreground">
            {contagem.compradores} comprador
            {contagem.compradores === 1 ? '' : 'es'} ·{' '}
            {contagem.vendedores} vendedor
            {contagem.vendedores === 1 ? '' : 'es'}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !associados || associados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cliente associado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {associados.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.nome}</p>
                    <Badge
                      variant={
                        c.papel === 'vendedor' ? 'secondary' : 'outline'
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {c.papel === 'vendedor' ? 'Vendedor' : 'Comprador'}
                    </Badge>
                  </div>
                  {c.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {c.email}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => desassociar.mutate(c.id)}
                  disabled={desassociar.isPending}
                  title="Desassociar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {disponiveis.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Associar cliente:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={clienteSelecionado}
                onValueChange={setClienteSelecionado}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Escolher cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {disponiveis.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={papelSelecionado}
                onValueChange={(v) => setPapelSelecionado(v as PapelAssociacao)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprador">Comprador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssociar}
                disabled={!clienteSelecionado || associar.isPending}
                className="w-full sm:w-auto"
              >
                {associar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {associar.isError && (
              <p className="text-xs text-destructive">
                {(associar.error as { response?: { data?: { detail?: string } } })
                  ?.response?.data?.detail ??
                  'Não foi possível associar o cliente.'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}