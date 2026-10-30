import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Link2, Copy, RefreshCw, Ban, BarChart3, ExternalLink, Loader2,
} from 'lucide-react'
import {
  useLinkDoCliente,
  useCriarLink,
  useRenovarLink,
  useRevogarLink,
} from '@/hooks/use-links'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/toast'
import { DialogAnalytics } from './DialogAnalytics'

interface Props {
  clienteId: number
}

export default function LinkCliente({ clienteId }: Props) {
  const { data: link, isLoading } = useLinkDoCliente(clienteId)
  const criar = useCriarLink()
  const renovar = useRenovarLink()
  const revogar = useRevogarLink()
  const [confirmRevogar, setConfirmRevogar] = useState(false)
  const [analyticsAberto, setAnalyticsAberto] = useState(false)

  async function copiar() {
    if (!link?.url_publica) return
    try {
      await navigator.clipboard.writeText(link.url_publica)
      notify.sucesso('URL copiado.')
    } catch {
      notify.erro('Não consegui copiar.')
    }
  }

  async function handleCriar() {
    try {
      const novo = await criar.mutateAsync({ cliente_id: clienteId })
      notify.sucesso('Link criado.')
      if (novo.url_publica) {
        await navigator.clipboard.writeText(novo.url_publica).catch(() => {})
        notify.sucesso('URL copiado.')
      }
    } catch (e: any) {
      notify.erro(e?.response?.data?.detail ?? 'Erro ao criar link.')
    }
  }

  async function handleRenovar() {
    if (!link) return
    renovar.mutate(link.id, {
      onSuccess: () => notify.sucesso('Link renovado.'),
      onError: () => notify.erro('Erro ao renovar.'),
    })
  }

  function handleRevogar() {
    if (!link) return
    revogar.mutate(link.id, {
      onSuccess: () => {
        notify.sucesso('Link revogado.')
        setConfirmRevogar(false)
      },
      onError: () => notify.erro('Erro ao revogar.'),
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link do cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!link ? (
            <>
              <p className="text-sm text-muted-foreground">
                Ainda não existe link para este cliente. Cria um para partilhar
                a seleção de imóveis.
              </p>
              <Button onClick={handleCriar} disabled={criar.isPending}>
                {criar.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Criar link
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {link.ativo ? (
                  <Badge variant="secondary">ativo</Badge>
                ) : (
                  <Badge variant="destructive">revogado</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  expira em {new Date(link.expira_em).toLocaleDateString('pt-PT')}
                </span>
              </div>

              {link.url_publica && (
                <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                  {link.url_publica}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copiar}
                  disabled={!link.url_publica}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={link.url_publica ?? '#'} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Abrir
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAnalyticsAberto(true)}
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Analytics ({link.num_acessos})
                </Button>

                {/* Renovar: sempre visível. Label muda conforme o estado. */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRenovar}
                  disabled={renovar.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {link.ativo ? 'Renovar' : 'Reativar'}
                </Button>

                {/* Revogar: só quando está ativo */}
                {link.ativo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmRevogar(true)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Revogar
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {link.num_imoveis}{' '}
                {link.num_imoveis === 1 ? 'imóvel' : 'imóveis'} no link
                {link.ultimo_acesso_em && (
                  <>
                    {' · '}último acesso{' '}
                    {new Date(link.ultimo_acesso_em).toLocaleString('pt-PT')}
                  </>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {link && (
        <ConfirmDialog
          open={confirmRevogar}
          onOpenChange={setConfirmRevogar}
          titulo="Revogar link?"
          descricao="O cliente perde o acesso imediatamente. Podes renovar mais tarde."
          textoConfirmar="Revogar"
          onConfirm={handleRevogar}
        />
      )}

      {link && (
        <DialogAnalytics
          open={analyticsAberto}
          onOpenChange={setAnalyticsAberto}
          linkId={link.id}
        />
      )}
    </>
  )
}