import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, CheckCircle2, Trash2 } from 'lucide-react'
import {
  useQualificacao,
  useUpsertQualificacao,
  useApagarQualificacao,
} from '@/hooks/use-qualificacao-comprador'
import { useAtualizarCliente } from '@/hooks/use-clientes'
import type {
  Cliente,
  QualificacaoComprador,
  QualificacaoCompradorUpsert,
  UrgenciaComprador,
  EstadoDesejadoImovel,
} from '@/types'
import { notify } from '@/lib/toast'

// ============================================================================
// Estado inicial / conversão
// ============================================================================

function inicial(q: QualificacaoComprador | null): QualificacaoCompradorUpsert {
  return {
    estado: q?.estado ?? 'nao_iniciada',
    compra_sozinho: q?.compra_sozinho ?? null,
    disp_notas: q?.disp_notas ?? null,
    disp_alternativas: q?.disp_alternativas ?? null,
    motivo_compra: q?.motivo_compra ?? null,
    tempo_procura: q?.tempo_procura ?? null,
    urgencia: q?.urgencia ?? null,
    quando_resolver: q?.quando_resolver ?? null,
    tem_imovel_venda: q?.tem_imovel_venda ?? null,
    precisa_vender_comprar: q?.precisa_vender_comprar ?? null,
    caracteristicas: q?.caracteristicas ?? null,
    nao_prescinde: q?.nao_prescinde ?? null,
    valor_maximo: q?.valor_maximo ?? null,
    zonas_pretendidas: q?.zonas_pretendidas ?? null,
    motivo_zonas: q?.motivo_zonas ?? null,
    quartos: q?.quartos ?? null,
    tipologia: q?.tipologia ?? null,
    estado_desejado: q?.estado_desejado ?? null,
    preferencia_andar: q?.preferencia_andar ?? null,
    elevador: q?.elevador ?? null,
    parqueamento: q?.parqueamento ?? null,
    arrecadacao: q?.arrecadacao ?? null,
    exteriores: q?.exteriores ?? null,
    acessos: q?.acessos ?? null,
    transportes: q?.transportes ?? null,
    comercio_jardins: q?.comercio_jardins ?? null,
    areas_especificas: q?.areas_especificas ?? null,
    notas_extra: q?.notas_extra ?? null,
    compra_pp: q?.compra_pp ?? null,
    financiamento_100: q?.financiamento_100 ?? null,
    falou_banco: q?.falou_banco ?? null,
    banco: q?.banco ?? null,
    capitais_proprios: q?.capitais_proprios ?? null,
    capitais_proprios_valor: q?.capitais_proprios_valor ?? null,
    efetivo: q?.efetivo ?? null,
    fiadores: q?.fiadores ?? null,
    reuniao_loja: q?.reuniao_loja ?? null,
  }
}

// ============================================================================
// Helpers de campo (locais, para manter o form legível)
// ============================================================================

interface FieldProps {
  id: string
  label: string
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
  type?: 'text' | 'number'
  textarea?: boolean
  disabled?: boolean
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  textarea,
  disabled,
}: FieldProps) {
  const v = value ?? ''
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {textarea ? (
        <textarea
          id={id}
          value={v}
          onChange={(e) => onChange(e.target.value || null)}
          rows={2}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : (
        <Input
          id={id}
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          value={v}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

interface SelectBoolProps {
  id: string
  label: string
  value: boolean | null
  onChange: (v: boolean | null) => void
  disabled?: boolean
}

function SelectBool({ id, label, value, onChange, disabled }: SelectBoolProps) {
  const v = value === true ? 'sim' : value === false ? 'nao' : ''
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={v}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === 'sim' ? true : raw === 'nao' ? false : null)
        }}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">Não respondido</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>
  )
}

interface SelectEnumProps<T extends string> {
  id: string
  label: string
  value: T | null
  options: { value: T; label: string }[]
  onChange: (v: T | null) => void
  disabled?: boolean
}

function SelectEnum<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: SelectEnumProps<T>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? null : (raw as T))
        }}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ============================================================================
// Wrapper: loading + aviso para cliente não-comprador
// ============================================================================

interface Props {
  cliente: Cliente
}

export function QualificacaoCompradorForm({ cliente }: Props) {
  const { data, isLoading } = useQualificacao(cliente.id)

  if (!cliente.e_comprador) {
    return (
      <p className="text-sm text-muted-foreground">
        Este cliente não está marcado como comprador. Ativa o papel de
        comprador nos dados do cliente para preencher a ficha.
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  // key força remount quando a ficha chega/muda de id
  return (
    <FormInner
      key={data?.id ?? `new-${cliente.id}`}
      cliente={cliente}
      qualificacao={data ?? null}
    />
  )
}

// ============================================================================
// Formulário (só monta depois de ter os dados)
// ============================================================================

interface InnerProps {
  cliente: Cliente
  qualificacao: QualificacaoComprador | null
}

function FormInner({ cliente, qualificacao }: InnerProps) {
  const upsert = useUpsertQualificacao(cliente.id)
  const apagar = useApagarQualificacao(cliente.id)
  const atualizarCliente = useAtualizarCliente(cliente.id)
  const [form, setForm] = useState<QualificacaoCompradorUpsert>(() =>
    inicial(qualificacao)
  )

  const set = <K extends keyof QualificacaoCompradorUpsert>(
    campo: K,
    valor: QualificacaoCompradorUpsert[K]
  ) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const submitting = upsert.isPending

  function gravar(estado: 'em_preenchimento' | 'concluida') {
    upsert.mutate(
      { ...form, estado },
      {
        onSuccess: () => {
          notify.sucesso(
            estado === 'concluida'
              ? 'Qualificação marcada como concluída.'
              : 'Rascunho guardado.'
          )
          // Sugestão de papel: se tem imóvel para venda, sugerir vendedor
          if (form.tem_imovel_venda === true && !cliente.e_vendedor) {
            atualizarCliente.mutate(
              { e_vendedor: true },
              {
                onSuccess: () =>
                  notify.sucesso(
                    'Cliente marcado também como vendedor.'
                  ),
              }
            )
          }
        },
        onError: () => notify.erro('Erro ao guardar qualificação.'),
      }
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    gravar('em_preenchimento')
  }

  function handleApagar() {
    if (!confirm('Apagar a ficha de qualificação? Esta ação não pode ser revertida.')) {
      return
    }
    apagar.mutate(undefined, {
      onSuccess: () => notify.sucesso('Qualificação apagada.'),
      onError: () => notify.erro('Erro ao apagar qualificação.'),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── 1. Disponibilidade ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SelectBool
            id="compra_sozinho"
            label="Vai comprar sozinho(a)?"
            value={form.compra_sozinho}
            onChange={(v) => set('compra_sozinho', v)}
            disabled={submitting}
          />
          <TextField
            id="disp_alternativas"
            label="Alternativas de disponibilidade para visitas"
            value={form.disp_alternativas}
            onChange={(v) => set('disp_alternativas', v)}
            textarea
            placeholder="Ex.: sábado de manhã, dias úteis ao fim do dia…"
            disabled={submitting}
          />
          <TextField
            id="disp_notas"
            label="Notas de disponibilidade"
            value={form.disp_notas}
            onChange={(v) => set('disp_notas', v)}
            textarea
            disabled={submitting}
          />
        </CardContent>
      </Card>

      {/* ── 2. Perfil / Motivação ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Perfil / Motivação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextField
            id="motivo_compra"
            label="Motivo da compra"
            value={form.motivo_compra}
            onChange={(v) => set('motivo_compra', v)}
            textarea
            disabled={submitting}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              id="tempo_procura"
              label="Há quanto tempo procura?"
              value={form.tempo_procura}
              onChange={(v) => set('tempo_procura', v)}
              disabled={submitting}
            />
            <SelectEnum<UrgenciaComprador>
              id="urgencia"
              label="Urgência da compra"
              value={form.urgencia}
              options={[
                { value: 'baixa', label: 'Baixa' },
                { value: 'media', label: 'Média' },
                { value: 'alta', label: 'Alta' },
              ]}
              onChange={(v) => set('urgencia', v)}
              disabled={submitting}
            />
          </div>
          <TextField
            id="quando_resolver"
            label="Quando quer resolver a situação de compra?"
            value={form.quando_resolver}
            onChange={(v) => set('quando_resolver', v)}
            disabled={submitting}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectBool
              id="tem_imovel_venda"
              label="Tem imóvel para venda?"
              value={form.tem_imovel_venda}
              onChange={(v) => set('tem_imovel_venda', v)}
              disabled={submitting}
            />
            <SelectBool
              id="precisa_vender_comprar"
              label="Precisa de vender para comprar?"
              value={form.precisa_vender_comprar}
              onChange={(v) => set('precisa_vender_comprar', v)}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Imóvel pretendido ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Imóvel pretendido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TextField
            id="caracteristicas"
            label="Características que procura"
            value={form.caracteristicas}
            onChange={(v) => set('caracteristicas', v)}
            textarea
            disabled={submitting}
          />
          <TextField
            id="nao_prescinde"
            label="Do que não prescinde?"
            value={form.nao_prescinde}
            onChange={(v) => set('nao_prescinde', v)}
            textarea
            disabled={submitting}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextField
              id="valor_maximo"
              label="Valor máximo (€)"
              type="number"
              value={form.valor_maximo}
              onChange={(v) => set('valor_maximo', v)}
              disabled={submitting}
            />
            <TextField
              id="quartos"
              label="Quartos"
              type="number"
              value={form.quartos != null ? String(form.quartos) : null}
              onChange={(v) => {
                const n = v == null || v === '' ? null : Number(v)
                set('quartos', n != null && Number.isFinite(n) ? n : null)
              }}
              disabled={submitting}
            />
            <TextField
              id="tipologia"
              label="Tipologia"
              value={form.tipologia}
              onChange={(v) => set('tipologia', v)}
              placeholder="T0, T1, T2…"
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              id="zonas_pretendidas"
              label="Zonas pretendidas"
              value={form.zonas_pretendidas}
              onChange={(v) => set('zonas_pretendidas', v)}
              textarea
              disabled={submitting}
            />
            <TextField
              id="motivo_zonas"
              label="Porquê essas zonas?"
              value={form.motivo_zonas}
              onChange={(v) => set('motivo_zonas', v)}
              textarea
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectEnum<EstadoDesejadoImovel>
              id="estado_desejado"
              label="Estado do imóvel"
              value={form.estado_desejado}
              options={[
                { value: 'novo', label: 'Novo' },
                { value: 'semi_novo', label: 'Semi-novo' },
                { value: 'remodelado', label: 'Remodelado' },
                { value: 'obras', label: 'Para obras' },
                { value: 'indiferente', label: 'Indiferente' },
              ]}
              onChange={(v) => set('estado_desejado', v)}
              disabled={submitting}
            />
            <TextField
              id="preferencia_andar"
              label="Preferência de andar"
              value={form.preferencia_andar}
              onChange={(v) => set('preferencia_andar', v)}
              disabled={submitting}
            />
            <SelectBool
              id="elevador"
              label="Precisa de elevador?"
              value={form.elevador}
              onChange={(v) => set('elevador', v)}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField
              id="parqueamento"
              label="Parqueamento / garagem"
              value={form.parqueamento}
              onChange={(v) => set('parqueamento', v)}
              disabled={submitting}
            />
            <SelectBool
              id="arrecadacao"
              label="Precisa de arrecadação?"
              value={form.arrecadacao}
              onChange={(v) => set('arrecadacao', v)}
              disabled={submitting}
            />
          </div>
          <TextField
            id="exteriores"
            label="Varandas / espaços exteriores"
            value={form.exteriores}
            onChange={(v) => set('exteriores', v)}
            textarea
            disabled={submitting}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextField
              id="acessos"
              label="Importância dos acessos"
              value={form.acessos}
              onChange={(v) => set('acessos', v)}
              textarea
              disabled={submitting}
            />
            <TextField
              id="transportes"
              label="Transportes públicos"
              value={form.transportes}
              onChange={(v) => set('transportes', v)}
              textarea
              disabled={submitting}
            />
            <TextField
              id="comercio_jardins"
              label="Comércio, jardins, etc."
              value={form.comercio_jardins}
              onChange={(v) => set('comercio_jardins', v)}
              textarea
              disabled={submitting}
            />
          </div>
          <TextField
            id="areas_especificas"
            label="Áreas específicas (sala, cozinha, quartos)"
            value={form.areas_especificas}
            onChange={(v) => set('areas_especificas', v)}
            textarea
            disabled={submitting}
          />
          <TextField
            id="notas_extra"
            label="Algo importante que deva saber para o ajudar?"
            value={form.notas_extra}
            onChange={(v) => set('notas_extra', v)}
            textarea
            disabled={submitting}
          />
        </CardContent>
      </Card>

      {/* ── 4. Financeira ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Financeira</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectBool
              id="compra_pp"
              label="Compra a pronto pagamento?"
              value={form.compra_pp}
              onChange={(v) => set('compra_pp', v)}
              disabled={submitting}
            />
            <SelectBool
              id="financiamento_100"
              label="Financiamento a 100%?"
              value={form.financiamento_100}
              onChange={(v) => set('financiamento_100', v)}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectBool
              id="falou_banco"
              label="Já falou com o banco?"
              value={form.falou_banco}
              onChange={(v) => set('falou_banco', v)}
              disabled={submitting}
            />
            <TextField
              id="banco"
              label="Qual banco?"
              value={form.banco}
              onChange={(v) => set('banco', v)}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectBool
              id="capitais_proprios"
              label="Tem capitais próprios?"
              value={form.capitais_proprios}
              onChange={(v) => set('capitais_proprios', v)}
              disabled={submitting}
            />
            <TextField
              id="capitais_proprios_valor"
              label="Valor de capitais próprios (€)"
              type="number"
              value={form.capitais_proprios_valor}
              onChange={(v) => set('capitais_proprios_valor', v)}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectBool
              id="efetivo"
              label="É em efetivo?"
              value={form.efetivo}
              onChange={(v) => set('efetivo', v)}
              disabled={submitting}
            />
            <SelectBool
              id="fiadores"
              label="Tem fiadores?"
              value={form.fiadores}
              onChange={(v) => set('fiadores', v)}
              disabled={submitting}
            />
          </div>
          <SelectBool
            id="reuniao_loja"
            label="Reunião na loja já agendada?"
            value={form.reuniao_loja}
            onChange={(v) => set('reuniao_loja', v)}
            disabled={submitting}
          />
        </CardContent>
      </Card>

      {/* ── Ações ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleApagar}
          disabled={submitting || apagar.isPending || !qualificacao}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Apagar ficha
        </Button>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar rascunho
          </Button>
          <Button
            type="button"
            onClick={() => gravar('concluida')}
            disabled={submitting}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Marcar concluída
          </Button>
        </div>
      </div>
    </form>
  )
}

// Reexport default para consistência com outros componentes
export default QualificacaoCompradorForm