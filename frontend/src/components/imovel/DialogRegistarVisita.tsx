import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, AlertCircle } from 'lucide-react'
import { useCriarVisita } from '@/hooks/use-visitas-imovel'
import { notify } from '@/lib/toast'
import type { VisitaImovelCreate, VisitanteOrigem } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  versaoId: number
}

const ORIGEM_OPTIONS: { value: VisitanteOrigem; label: string }[] = [
  { value: 'particular', label: 'Particular' },
  { value: 'agencia_externa', label: 'Agência externa' },
  { value: 'cliente_proprio', label: 'Cliente próprio' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'outro', label: 'Outro' },
]

const SUB_RATING_KEYS = [
  'rating_areas',
  'rating_acabamentos',
  'rating_localizacao',
  'rating_apresentacao',
  'rating_preco',
] as const

type SubRatingKey = (typeof SUB_RATING_KEYS)[number]

const RATING_FIELDS: { key: keyof VisitaImovelCreate; label: string }[] = [
  { key: 'rating_areas', label: 'Áreas' },
  { key: 'rating_acabamentos', label: 'Acabamentos' },
  { key: 'rating_localizacao', label: 'Localização' },
  { key: 'rating_apresentacao', label: 'Apresentação' },
  { key: 'rating_preco', label: 'Preço' },
  { key: 'rating_global', label: 'Apreciação Global' },
]

function nowLocalInput(): string {
  const now = new Date()
  const tzOffset = now.getTimezoneOffset() * 60000
  const local = new Date(now.getTime() - tzOffset)
  return local.toISOString().slice(0, 16)
}

function sugerirGlobal(form: VisitaImovelCreate): number {
  const soma = SUB_RATING_KEYS.reduce((acc, k) => acc + form[k], 0)
  const media = Math.round(soma / SUB_RATING_KEYS.length)
  return Math.max(1, Math.min(5, media))
}

function emptyForm(): VisitaImovelCreate {
  const base: VisitaImovelCreate = {
    data_visita: nowLocalInput(),
    visitante_nome: '',
    visitante_contacto: null,
    visitante_email: null,
    consultor_representante: null,
    notas_internas: null,
    visitante_origem: 'particular',
    agencia_nome: null,
    gostou: null,
    nao_gostou: null,
    observacoes: null,
    rating_areas: 3,
    rating_acabamentos: 3,
    rating_localizacao: 3,
    rating_apresentacao: 3,
    rating_preco: 3,
    rating_global: 3,
    compraria: false,
  }
  return { ...base, rating_global: sugerirGlobal(base) }
}

export default function DialogRegistarVisita({
  open,
  onOpenChange,
  versaoId,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registar visita</DialogTitle>
          <DialogDescription>
            Preenche a ficha de visita. Os dados pessoais e as notas internas
            ficam apenas no CRM; o vendedor vê apenas o feedback e as
            classificações.
          </DialogDescription>
        </DialogHeader>
        <FormInner versaoId={versaoId} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function FormInner({
  versaoId,
  onClose,
}: {
  versaoId: number
  onClose: () => void
}) {
  const [form, setForm] = useState<VisitaImovelCreate>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [globalManual, setGlobalManual] = useState(false)
  const criar = useCriarVisita(versaoId)

  function setField<K extends keyof VisitaImovelCreate>(
    k: K,
    v: VisitaImovelCreate[K],
  ) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function setSubRating(key: SubRatingKey, value: number) {
    setForm((prev) => {
      const updated = { ...prev, [key]: value }
      if (!globalManual) {
        updated.rating_global = sugerirGlobal(updated)
      }
      return updated
    })
  }

  /** Actualiza o global manualmente e bloqueia futuras auto-sugestões. */
  function handleGlobalChange(value: number) {
    setGlobalManual(true)
    setForm((prev) => ({ ...prev, rating_global: value }))
  }

  function resetGlobalToAuto() {
    setGlobalManual(false)
    setForm((prev) => ({ ...prev, rating_global: sugerirGlobal(prev) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.data_visita) {
      setError('Data/hora é obrigatória.')
      return
    }
    if (!form.visitante_nome.trim()) {
      setError('Nome do visitante é obrigatório.')
      return
    }
    if (
      form.visitante_origem === 'agencia_externa' &&
      !form.agencia_nome?.trim()
    ) {
      setError('Indica o nome da agência (ou escolhe outro tipo de visitante).')
      return
    }

    const payload: VisitaImovelCreate = {
      ...form,
      data_visita: new Date(form.data_visita).toISOString(),
      visitante_nome: form.visitante_nome.trim(),
      visitante_contacto: form.visitante_contacto?.trim() || null,
      visitante_email: form.visitante_email?.trim() || null,
      consultor_representante: form.consultor_representante?.trim() || null,
      notas_internas: form.notas_internas?.trim() || null,
      agencia_nome: form.agencia_nome?.trim() || null,
      gostou: form.gostou?.trim() || null,
      nao_gostou: form.nao_gostou?.trim() || null,
      observacoes: form.observacoes?.trim() || null,
    }

    criar.mutate(payload, {
      onSuccess: () => {
        notify.sucesso('Visita registada.')
        onClose()
      },
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail
        setError(detail || 'Erro ao registar visita.')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="data_visita">Data e hora *</Label>
            <Input
              id="data_visita"
              type="datetime-local"
              value={form.data_visita}
              onChange={(e) => setField('data_visita', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="visitante_origem">Origem *</Label>
            <Select
              value={form.visitante_origem}
              onValueChange={(v) =>
                setField('visitante_origem', v as VisitanteOrigem)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGEM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.visitante_origem === 'agencia_externa' && (
          <div>
            <Label htmlFor="agencia_nome">Nome da agência *</Label>
            <Input
              id="agencia_nome"
              value={form.agencia_nome ?? ''}
              onChange={(e) =>
                setField('agencia_nome', e.target.value || null)
              }
            />
          </div>
        )}
      </section>

      <section className="space-y-3 pt-3 border-t">
        <h3 className="text-sm font-semibold">
          Visitante{' '}
          <span className="text-xs font-normal text-muted-foreground">
            (dados internos)
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="visitante_nome">Nome *</Label>
            <Input
              id="visitante_nome"
              value={form.visitante_nome}
              onChange={(e) => setField('visitante_nome', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="visitante_contacto">Contacto</Label>
            <Input
              id="visitante_contacto"
              value={form.visitante_contacto ?? ''}
              onChange={(e) =>
                setField('visitante_contacto', e.target.value || null)
              }
            />
          </div>
          <div>
            <Label htmlFor="visitante_email">Email</Label>
            <Input
              id="visitante_email"
              type="email"
              value={form.visitante_email ?? ''}
              onChange={(e) =>
                setField('visitante_email', e.target.value || null)
              }
            />
          </div>
          <div>
            <Label htmlFor="consultor_representante">
              Consultor representante
            </Label>
            <Input
              id="consultor_representante"
              value={form.consultor_representante ?? ''}
              onChange={(e) =>
                setField('consultor_representante', e.target.value || null)
              }
              placeholder="Se aplicável"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 pt-3 border-t">
        <h3 className="text-sm font-semibold">Feedback do visitante</h3>
        <div>
          <Label htmlFor="gostou">O que mais gostou</Label>
          <Textarea
            id="gostou"
            value={form.gostou ?? ''}
            onChange={(e) => setField('gostou', e.target.value || null)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="nao_gostou">O que menos gostou</Label>
          <Textarea
            id="nao_gostou"
            value={form.nao_gostou ?? ''}
            onChange={(e) => setField('nao_gostou', e.target.value || null)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={form.observacoes ?? ''}
            onChange={(e) =>
              setField('observacoes', e.target.value || null)
            }
            rows={2}
          />
        </div>
      </section>

      <section className="space-y-3 pt-3 border-t">
        <h3 className="text-sm font-semibold">
          Classificação (1 = Mau, 5 = Excelente)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {RATING_FIELDS.map(({ key, label }) => {
            const isGlobal = key === 'rating_global'
            return (
              <div key={key}>
                <Label htmlFor={key}>
                  {label}
                  {isGlobal && !globalManual && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      (auto)
                    </span>
                  )}
                </Label>
                <Select
                  value={String(form[key])}
                  onValueChange={(v) => {
                    const num = Number(v)
                    if (isGlobal) {
                      handleGlobalChange(num)
                    } else {
                      setSubRating(key as SubRatingKey, num)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
        {globalManual && (
          <button
            type="button"
            onClick={resetGlobalToAuto}
            className="text-xs text-primary hover:underline"
          >
            Voltar a sugerir automaticamente
          </button>
        )}
        <div className="flex items-center gap-3 pt-2">
          <Switch
            id="compraria"
            checked={form.compraria}
            onCheckedChange={(v) => setField('compraria', v)}
          />
          <Label htmlFor="compraria">O visitante compraria a casa?</Label>
        </div>
      </section>

      <section className="space-y-3 pt-3 border-t">
        <h3 className="text-sm font-semibold">
          Notas internas{' '}
          <span className="text-xs font-normal text-muted-foreground">
            (só no CRM)
          </span>
        </h3>
        <Textarea
          value={form.notas_internas ?? ''}
          onChange={(e) =>
            setField('notas_internas', e.target.value || null)
          }
          rows={3}
          placeholder="Notas que não devem aparecer ao vendedor"
        />
      </section>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 p-3 rounded">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={criar.isPending}>
          {criar.isPending && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          Registar visita
        </Button>
      </DialogFooter>
    </form>
  )
}