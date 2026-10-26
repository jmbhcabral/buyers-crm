import { useState } from 'react'
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

interface Props {
  versaoId: number
}

export default function ClientesAssociados({ versaoId }: Props) {
  const { data: associados, isLoading } = useClientesDoImovel(versaoId)
  const { data: todos } = useClientes()
  const associar = useAssociarCliente(versaoId)
  const desassociar = useDesassociarCliente(versaoId)
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('')

  const idsAssociados = new Set((associados ?? []).map((c) => c.id))
  const disponiveis = (todos ?? []).filter((c) => !idsAssociados.has(c.id))

  function handleAssociar() {
    if (!clienteSelecionado) return
    associar.mutate(Number(clienteSelecionado), {
      onSuccess: () => setClienteSelecionado(''),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clientes interessados ({associados?.length ?? 0})
        </CardTitle>
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
                <div>
                  <p className="font-medium text-sm">{c.nome}</p>
                  {c.email && (
                    <p className="text-xs text-muted-foreground">{c.email}</p>
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
            <div className="flex gap-2">
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
              <Button
                onClick={handleAssociar}
                disabled={!clienteSelecionado || associar.isPending}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}