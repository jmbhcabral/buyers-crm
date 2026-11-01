import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {  Plus, X, Image as ImageIcon } from 'lucide-react'
import { notify } from '@/lib/toast'
import { useLinkDoCliente } from '@/hooks/use-links'
import {
  useAdicionarImovelAoLink,
  useRemoverImovelDoLink,
} from '@/hooks/use-links'
import type { ImovelVersaoListItem } from '@/types'
import type { EstadoImovel } from '@/types'


const ESTADO_LABEL: Record<EstadoImovel, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  cpcv: 'CPCV',
  escritura_marcada: 'Escritura marcada',
  vendido: 'Vendido',
  saiu_mercado: 'Saiu de mercado',
}

interface Props {
  clienteId: number
  imoveisAssociados: ImovelVersaoListItem[]  // vem do useImoveisDoCliente
}

export default function GestaoImoveisDoLink({ clienteId, imoveisAssociados }: Props) {
  const { data: link } = useLinkDoCliente(clienteId)
  const adicionar = useAdicionarImovelAoLink()
  const remover = useRemoverImovelDoLink()

  if (!link) {
    return null  // o painel LinkCliente já diz "cria link primeiro"
  }

  const linkId = link.id  // <-- link já é garantidamente não-nulo aqui
  const idsNoLink = new Set(link.imoveis.map((i) => i.imovel_versao_id))

  function handleAdicionar(versaoId: number) {
    adicionar.mutate({ linkId, versaoId }, {  // <-- usa linkId
      onSuccess: () => notify.sucesso('Imóvel adicionado ao link.'),
      onError: () => notify.erro('Erro ao adicionar.'),
    })
  }

  function handleRemover(versaoId: number) {
    remover.mutate({ linkId, versaoId }, {  // <-- usa linkId
      onSuccess: () => notify.sucesso('Imóvel removido do link.'),
      onError: () => notify.erro('Erro ao remover.'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Imóveis no link ({link.imoveis.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Imóveis JÁ no link */}
        {link.imoveis.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Incluídos
            </p>
            {link.imoveis.map((i) => (
              <div
                key={i.imovel_versao_id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">
                    {i.titulo || 'Sem título'}
                  </p>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {ESTADO_LABEL[i.estado_imovel]}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {i.preco || '—'} · {i.num_fotos} fotos
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemover(i.imovel_versao_id)}
                  disabled={remover.isPending}
                  title="Remover do link"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Imóveis DISPONÍVEIS (associados ao cliente mas não no link) */}
        {imoveisAssociados.filter((i) => !idsNoLink.has(i.id)).length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Disponíveis (associados ao cliente)
            </p>
            {imoveisAssociados
              .filter((i) => !idsNoLink.has(i.id))
              .map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between p-2 border rounded bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">
                      {i.titulo || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {i.preco || '—'} · {i.num_fotos} fotos
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdicionar(i.id)}
                    disabled={adicionar.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Incluir
                  </Button>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {link.imoveis.length > 0
              ? 'Todos os imóveis associados já estão no link.'
              : 'Este cliente não tem imóveis associados. Associa imóveis no detalhe do imóvel.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}