import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Users2 } from 'lucide-react'
import { useAtualizarCliente } from '@/hooks/use-clientes'
import { useEquipasDisponiveis } from '@/hooks/use-equipas'
import type { Cliente } from '@/types'
import { notify } from '@/lib/toast'

interface Props {
  cliente: Cliente
}

const PESSOAL = '__pessoal__'

export default function FormCliente({ cliente }: Props) {
  const update = useAtualizarCliente(cliente.id)
  const { isAdmin, minhaEquipaId, equipas, carregando } = useEquipasDisponiveis()

  const [nome, setNome] = useState(cliente.nome)
  const [email, setEmail] = useState(cliente.email ?? '')
  const [telefone, setTelefone] = useState(cliente.telefone ?? '')
  const [nif, setNif] = useState(cliente.nif ?? '')
  const [notas, setNotas] = useState(cliente.notas ?? '')
  const [eComprador, setEComprador] = useState(cliente.e_comprador)
  const [eVendedor, setEVendedor] = useState(cliente.e_vendedor)
  const [equipaId, setEquipaId] = useState<number | null>(cliente.equipa_id)

  const papeisValidos = eComprador || eVendedor

  // O utilizador só pode escolher:
  //  - null (pessoal) — sempre
  //  - admin: qualquer equipa da lista
  //  - não-admin com equipa: só a sua
  const equipasOpcoes: { id: number; label: string }[] = isAdmin
    ? equipas.map((e) => ({ id: e.id, label: e.nome }))
    : minhaEquipaId
      ? [{ id: minhaEquipaId, label: 'Minha Equipa' }]
      : []

  const equipaAtualValor = equipaId == null ? PESSOAL : String(equipaId)

  function handleEquipaChange(v: string) {
    setEquipaId(v === PESSOAL ? null : Number(v))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!papeisValidos) return

    update.mutate(
      {
        nome,
        email: email || null,
        telefone: telefone || null,
        nif: nif || null,
        notas: notas || null,
        equipa_id: equipaId,
        e_comprador: eComprador,
        e_vendedor: eVendedor,
      },
      {
        onSuccess: () => notify.sucesso('Cliente atualizado.'),
        onError: () => notify.erro('Erro ao atualizar cliente.'),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados do cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nif">NIF</Label>
            <Input
              id="nif"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Papéis</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={eComprador}
                  onCheckedChange={(v) => setEComprador(v === true)}
                />
                Comprador
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={eVendedor}
                  onCheckedChange={(v) => setEVendedor(v === true)}
                />
                Vendedor
              </label>
            </div>
            {!papeisValidos && (
              <p className="text-xs text-destructive">
                O cliente tem de ser comprador, vendedor, ou ambos.
              </p>
            )}
          </div>

          {equipasOpcoes.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users2 className="h-4 w-4" />
                Visibilidade
              </Label>
              <Select value={equipaAtualValor} onValueChange={handleEquipaChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PESSOAL}>Só para mim (pessoal)</SelectItem>
                  {equipasOpcoes.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      Equipa: {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {equipaId == null
                  ? 'Cliente privado — só tu tens acesso.'
                  : 'Cliente partilhado — todos os membros da equipa têm acesso.'}
              </p>
              {carregando && (
                <p className="text-xs text-muted-foreground">A carregar equipas…</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending || !papeisValidos}>
              {update.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}