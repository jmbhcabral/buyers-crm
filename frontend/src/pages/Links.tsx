import { Link } from 'react-router-dom'
import { useLinks } from '@/hooks/use-links'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Link2, Copy, ExternalLink } from 'lucide-react'
import { notify } from '@/lib/toast'

export default function Links() {
  const { data: links, isLoading } = useLinks()

  async function copiar(url: string | null) {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      notify.sucesso('URL copiado.')
    } catch {
      notify.erro('Não consegui copiar.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Links de clientes</h1>
        <p className="text-muted-foreground">
          {links ? `${links.length} link(s)` : 'A carregar...'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !links || links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-lg font-medium">Sem links ainda</p>
            <p className="text-sm text-muted-foreground">
              Vai ao detalhe de um cliente e cria o primeiro link.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {links.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{l.cliente_nome}</p>
                      {l.ativo ? (
                        <Badge variant="secondary" className="text-xs">
                          ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          revogado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {l.url_publica}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {l.num_imoveis} imóvel(is) · {l.num_acessos} acesso(s)
                      {l.ultimo_acesso_em &&
                        ` · último ${new Date(l.ultimo_acesso_em).toLocaleDateString('pt-PT')}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copiar(l.url_publica)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={l.url_publica ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/clientes/${l.cliente_id}`}>Ver cliente</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}