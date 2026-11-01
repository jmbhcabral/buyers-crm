import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useNotasCliente,
  useCriarNotaCliente,
  useMarcarNotaLida,
} from '@/hooks/use-interacoes-crm'

interface Props {
  clienteId: number
  imoveis: { id: number; titulo: string | null }[]
  imovelVersaoIdInicial?: number | null
}

export function SecaoNotas({
  clienteId,
  imoveis,
  imovelVersaoIdInicial,
}: Props) {
  // Só guardamos a escolha explícita do utilizador.
  const [userSelectedId, setUserSelectedId] = useState<number | null>(null)

  // Valor efetivo derivado a cada render — sem efeitos, sem cascata.
  const effectiveId: number | null = (() => {
    if (
      userSelectedId !== null &&
      imoveis.some((i) => i.id === userSelectedId)
    ) {
      return userSelectedId
    }
    if (
      imovelVersaoIdInicial != null &&
      imoveis.some((i) => i.id === imovelVersaoIdInicial)
    ) {
      return imovelVersaoIdInicial
    }
    return imoveis[0]?.id ?? null
  })()

  // Fetch all notes for the cliente; split locally por imóvel.
  const { data: todasNotas } = useNotasCliente(clienteId, undefined)
  const criar = useCriarNotaCliente(clienteId)
  const marcar = useMarcarNotaLida()
  const [texto, setTexto] = useState('')

  const threadNotas = (todasNotas ?? []).filter(
    (n) => n.imovel_versao_id === effectiveId
  )
  const legacyNotas = (todasNotas ?? []).filter(
    (n) => n.imovel_versao_id === null
  )

  async function enviar() {
    if (!texto.trim() || effectiveId === null) return
    await criar.mutateAsync({
      imovelVersaoId: effectiveId,
      conteudo: texto.trim(),
    })
    setTexto('')
  }

  if (imoveis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Associa primeiro um imóvel a este cliente para trocarem notas.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Seletor de imóvel */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Notas sobre o imóvel
        </label>
        <Select
          value={effectiveId !== null ? String(effectiveId) : ''}
          onValueChange={(v) => setUserSelectedId(Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Escolher imóvel..." />
          </SelectTrigger>
          <SelectContent>
            {imoveis.map((i) => (
              <SelectItem key={i.id} value={String(i.id)}>
                {i.titulo || `Imóvel #${i.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Thread do imóvel selecionado */}
      <div className="max-h-80 overflow-y-auto space-y-2">
        {threadNotas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem notas para este imóvel.
          </p>
        ) : (
          threadNotas.map((n) => (
            <div
              key={n.id}
              className={`p-2 rounded-lg ${
                n.autor_tipo === 'consultor'
                  ? 'bg-blue-50 ml-4'
                  : 'bg-gray-100 mr-4'
              }`}
              onMouseEnter={() => {
                if (
                  n.autor_tipo === 'cliente' &&
                  !n.lida_pelo_destinatario
                ) {
                  marcar.mutate(n.id)
                }
              }}
            >
              <p className="text-[11px] text-muted-foreground mb-1">
                {n.autor_tipo === 'consultor'
                  ? n.autor_nome ?? 'Consultor'
                  : 'Cliente'}
                {' · '}
                {new Date(n.criado_em).toLocaleString('pt-PT')}
                {n.autor_tipo === 'cliente' && !n.lida_pelo_destinatario && (
                  <span className="ml-2 text-red-600 font-semibold">NOVA</span>
                )}
              </p>
              <p className="text-sm whitespace-pre-line text-foreground">
                {n.conteudo}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t pt-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escrever nota ao cliente sobre este imóvel…"
          rows={2}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || criar.isPending || effectiveId === null}
          className="px-4 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50 self-end"
        >
          Enviar
        </button>
      </div>

      {/* Bucket legacy (só leitura) */}
      {legacyNotas.length > 0 && (
        <details className="text-xs border-t pt-3">
          <summary className="cursor-pointer text-muted-foreground">
            {legacyNotas.length} nota(s) antiga(s) sem imóvel associado
          </summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {legacyNotas.map((n) => (
              <div
                key={n.id}
                className="p-2 bg-amber-50 border border-amber-200 rounded"
              >
                <p className="text-muted-foreground mb-1">
                  {n.autor_tipo === 'consultor'
                    ? n.autor_nome ?? 'Consultor'
                    : 'Cliente'}
                  {' · '}
                  {new Date(n.criado_em).toLocaleString('pt-PT')}
                </p>
                <p className="whitespace-pre-line text-foreground">
                  {n.conteudo}
                </p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-1 italic">
            Estas notas foram criadas antes de as notas serem associadas a
            imóveis. Se ainda forem relevantes, copia-as para a thread do
            imóvel correto.
          </p>
        </details>
      )}
    </div>
  )
}