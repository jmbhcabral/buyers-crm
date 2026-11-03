import { useState, type FormEvent } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { useCriarCliente } from '@/hooks/use-clientes'
import { notify } from '@/lib/toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function DialogNovoCliente({ open, onOpenChange }: Props) {
  const criar = useCriarCliente()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nif, setNif] = useState('')
  const [notas, setNotas] = useState('')
  const [eComprador, setEComprador] = useState(true)
  const [eVendedor, setEVendedor] = useState(false)

  const papeisValidos = eComprador || eVendedor

  function reset() {
    setNome('')
    setEmail('')
    setTelefone('')
    setNif('')
    setNotas('')
    setEComprador(true)
    setEVendedor(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !papeisValidos) return

    try {
      await criar.mutateAsync({
        nome: nome.trim(),
        email: email || null,
        telefone: telefone || null,
        nif: nif || null,
        notas: notas || null,
        e_comprador: eComprador,
        e_vendedor: eVendedor,
      })
      reset()
      onOpenChange(false)
      notify.sucesso('Cliente criado!')
    } catch (err) {
      console.error('Erro ao criar cliente:', err)
      notify.erro('Erro ao criar cliente.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Adiciona um novo cliente à tua carteira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={criar.isPending}
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
                disabled={criar.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                disabled={criar.isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nif">NIF</Label>
            <Input
              id="nif"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              disabled={criar.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Papéis *</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={eComprador}
                  onCheckedChange={(v) => setEComprador(v === true)}
                  disabled={criar.isPending}
                />
                Comprador
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={eVendedor}
                  onCheckedChange={(v) => setEVendedor(v === true)}
                  disabled={criar.isPending}
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

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              disabled={criar.isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={criar.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={criar.isPending || !nome.trim() || !papeisValidos}
            >
              {criar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}