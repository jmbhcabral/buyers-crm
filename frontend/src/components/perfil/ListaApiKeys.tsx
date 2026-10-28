import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Key,
  Plus,
  Trash2,
  Calendar,
  Clock,
} from 'lucide-react'
import { useApiKeys, useRevogarApiKey } from '@/hooks/use-api-keys'
import DialogNovaApiKey from './DialogNovaApiKey'

export default function ListaApiKeys() {
  const { data: apiKeys, isLoading } = useApiKeys()
  const revogar = useRevogarApiKey()
  const [dialogAberto, setDialogAberto] = useState(false)

  function handleRevogar(id: number, nome: string) {
    if (!confirm(`Revogar a API key "${nome}"? Esta ação é irreversível.`)) return
    revogar.mutate(id)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </CardTitle>
          <Button size="sm" onClick={() => setDialogAberto(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nova
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                Sem API keys ainda.
              </p>
              <Button size="sm" onClick={() => setDialogAberto(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Criar primeira
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-3 border rounded space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{k.nome}</p>
                      {k.ativa ? (
                        <Badge variant="secondary" className="text-xs">
                          ativa
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          revogada
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevogar(k.id, k.nome)}
                      disabled={revogar.isPending}
                      title="Revogar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {k.prefixo}••••••••
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Criada:{' '}
                      {new Date(k.criado_em).toLocaleDateString('pt-PT')}
                    </span>
                    {k.ultimo_uso_em ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Último uso:{' '}
                        {new Date(k.ultimo_uso_em).toLocaleDateString('pt-PT')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Nunca usada
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DialogNovaApiKey open={dialogAberto} onOpenChange={setDialogAberto} />
    </>
  )
}