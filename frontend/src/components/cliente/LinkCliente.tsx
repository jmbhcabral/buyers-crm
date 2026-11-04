import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Link2, Copy, RefreshCw, Ban, BarChart3, ExternalLink, Loader2, UserCog,
} from 'lucide-react'
import {
  useLinkDoCliente,
  useCriarLink,
  useRenovarLink,
  useRevogarLink,
  useAlterarApresentacaoLink,
} from '@/hooks/use-links'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/toast'
import { DialogAnalytics } from './DialogAnalytics'
import api from '@/lib/api'
import type { Cliente, ConsultorComUser } from '@/types'

interface Props {
  clienteId: number
}

export default function LinkCliente({ clienteId }: Props) {
  const { data: link, isLoading } = useLinkDoCliente(clienteId)
  const { data: cliente } = useQuery<Cliente>({
    queryKey: ['cliente', clienteId],
    queryFn: async () => (await api.get(`/clientes/${clienteId}`)).data,
  })
  const { data: consultores } = useQuery<ConsultorComUser[]>({
    queryKey: ['consultores'],
    queryFn: async () => (await api.get('/consultores')).data,
  })

  const criar = useCriarLink()
  const renovar = useRenovarLink()
  const revogar = useRevogarLink()
  const [confirmRevogar, setConfirmRevogar] = useState(false)
  const [analyticsAberto, setAnalyticsAberto] = useState(false)
  const [alterandoApresentacao, setAlterandoApresentacao] = useState(false)

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

  const alterar = useAlterarApresentacaoLink()


  async function alterarApresentacao(novoId: number | null) {
    if (!link) return
    setAlterandoApresentacao(true)
    try {
      await alterar.mutateAsync({
        linkId: link.id,
        consultorApresentacaoId: novoId,
      })
      notify.sucesso('Consultor de apresentação atualizado.')
    } catch (e: any) {
      notify.erro(e?.response?.data?.detail ?? 'Erro ao alterar apresentação.')
    } finally {
      setAlterandoApresentacao(false)
    }
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

  // Elegíveis para apresentação:
  //  - cliente de equipa → consultores da mesma equipa
  //  - cliente pessoal → esconder selector
  const equipaIdCliente = cliente?.equipa_id ?? null
  const elegiveis: ConsultorComUser[] =
    equipaIdCliente !== null
      ? (consultores ?? []).filter((c) => c.equipa_id === equipaIdCliente)
      : []

  const apresentacaoEfetiva =
    link?.consultor_apresentacao_id ?? link?.consultor_id ?? null

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
                {equipaIdCliente !== null && (
                  <Badge variant="outline">equipa</Badge>
                )}
              </div>

              {link.url_publica && (
                <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                  {link.url_publica}
                </div>
              )}

              {/* Consultor de apresentação (só para clientes de equipa) */}
              {equipaIdCliente !== null && elegiveis.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-2">
                    <UserCog className="h-3.5 w-3.5" />
                    Consultor de apresentação
                  </label>
                  <Select
                    value={
                      apresentacaoEfetiva != null
                        ? String(apresentacaoEfetiva)
                        : ''
                    }
                    onValueChange={(v) => alterarApresentacao(Number(v))}
                    disabled={alterandoApresentacao}
                  >
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Escolher consultor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {elegiveis.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome ?? `Consultor #${c.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    É quem aparece na página pública. Alterável por qualquer
                    membro da equipa.
                  </p>
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

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRenovar}
                  disabled={renovar.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {link.ativo ? 'Renovar' : 'Reativar'}
                </Button>

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