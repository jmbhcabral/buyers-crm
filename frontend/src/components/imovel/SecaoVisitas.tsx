import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Trash2, User } from 'lucide-react'
import { useApagarVisita, useVisitasImovel } from '@/hooks/use-visitas-imovel'
import DialogRegistarVisita from './DialogRegistarVisita'
import { notify } from '@/lib/toast'
import type { VisitaImovel, VisitanteOrigem } from '@/types'

interface Props {
  versaoId: number
}

const ORIGEM_LABEL: Record<VisitanteOrigem, string> = {
  agencia_externa: 'Agência',
  particular: 'Particular',
  cliente_proprio: 'Cliente próprio',
  walk_in: 'Walk-in',
  outro: 'Outro',
}

export default function SecaoVisitas({ versaoId }: Props) {
  const { data: visitas, isLoading } = useVisitasImovel(versaoId)
  const apagar = useApagarVisita(versaoId)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleApagar(v: VisitaImovel) {
    if (
      !window.confirm(`Apagar visita de ${v.visitante_nome}?`)
    )
      return
    apagar.mutate(v.id, {
      onSuccess: () => notify.sucesso('Visita apagada.'),
      onError: () => notify.erro('Erro ao apagar.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visitas?.length ?? 0}{' '}
          {(visitas?.length ?? 0) === 1
            ? 'visita registada'
            : 'visitas registadas'}
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Registar visita
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (!visitas || visitas.length === 0) && (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Nenhuma visita registada ainda. A primeira só fica disponível
            quando o imóvel estiver associado a um cliente vendedor.
          </p>
        </div>
      )}

      {visitas && visitas.length > 0 && (
        <ul className="space-y-3">
          {visitas.map((v) => (
            <li key={v.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      {new Date(v.data_visita).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {ORIGEM_LABEL[v.visitante_origem]}
                      {v.agencia_nome ? ` · ${v.agencia_nome}` : ''}
                    </span>
                  </div>
                  <p className="text-sm mt-1">
                    <User className="inline h-3 w-3 mr-1" />
                    <span className="font-medium">{v.visitante_nome}</span>
                    {v.visitante_contacto && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {v.visitante_contacto}
                      </span>
                    )}
                    {v.visitante_email && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {v.visitante_email}
                      </span>
                    )}
                  </p>
                  {v.consultor_representante && (
                    <p className="text-xs text-muted-foreground">
                      Representado por: {v.consultor_representante}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleApagar(v)}
                  disabled={apagar.isPending}
                  title="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-xs text-muted-foreground">
                <span>Áreas {v.rating_areas}/5</span>
                <span>Acab. {v.rating_acabamentos}/5</span>
                <span>Loc. {v.rating_localizacao}/5</span>
                <span>Apres. {v.rating_apresentacao}/5</span>
                <span>Preço {v.rating_preco}/5</span>
                <span className="font-medium text-foreground">
                  Global {v.rating_global}/5
                </span>
              </div>

              <p className="text-xs">
                {v.compraria ? '✅ Compraria' : '❌ Não compraria'}
              </p>

              {v.gostou && (
                <p className="text-xs">
                  <span className="font-medium">Gostou:</span> {v.gostou}
                </p>
              )}
              {v.nao_gostou && (
                <p className="text-xs">
                  <span className="font-medium">Não gostou:</span>{' '}
                  {v.nao_gostou}
                </p>
              )}
              {v.observacoes && (
                <p className="text-xs">
                  <span className="font-medium">Obs.:</span> {v.observacoes}
                </p>
              )}
              {v.notas_internas && (
                <p className="text-xs bg-yellow-50 border border-yellow-200 p-2 rounded">
                  <span className="font-medium">Notas internas:</span>{' '}
                  {v.notas_internas}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <DialogRegistarVisita
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        versaoId={versaoId}
      />
    </div>
  )
}