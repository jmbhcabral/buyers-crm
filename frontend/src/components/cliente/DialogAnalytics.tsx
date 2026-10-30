import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useLinkAnalytics } from '@/hooks/use-links'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  linkId: number
}

export function DialogAnalytics({ open, onOpenChange, linkId }: Props) {
  const { data, isLoading } = useLinkAnalytics(linkId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics do link</DialogTitle>
          <DialogDescription>
            Quem abriu o link, quando, e que imóveis viu.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{data.num_acessos_total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{data.num_acessos_lista}</div>
                <div className="text-xs text-muted-foreground">Lista</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{data.num_acessos_detalhe}</div>
                <div className="text-xs text-muted-foreground">Imóvel</div>
              </div>
            </div>

            {data.por_imovel.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Por imóvel</h3>
                <div className="space-y-2">
                  {data.por_imovel.map((i) => (
                    <div
                      key={i.imovel_versao_id}
                      className="flex justify-between text-sm p-2 border rounded"
                    >
                      <span className="font-medium line-clamp-1">
                        {i.imovel_titulo ?? `#${i.imovel_versao_id}`}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap ml-2">
                        {i.num_acessos}×
                        {i.ultimo_acesso_em &&
                          ` · ${new Date(i.ultimo_acesso_em).toLocaleDateString('pt-PT')}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2">Acessos recentes</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {data.acessos_recentes.map((a) => (
                  <div
                    key={a.id}
                    className="text-xs p-2 border rounded flex justify-between gap-2"
                  >
                    <span className="line-clamp-1">
                      {a.imovel_titulo ?? 'Lista'}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(a.criado_em).toLocaleString('pt-PT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}