import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { useAtualizarCliente } from '@/hooks/use-clientes'
import type { Cliente } from '@/types'

interface Props {
  cliente: Cliente
}

export default function FormCliente({ cliente }: Props) {
  const update = useAtualizarCliente(cliente.id)

  // Inicialização direta — sem useEffect.
  // Se o `cliente` mudar, o pai deve passar uma `key` diferente
  // para forçar o remount (ver ClienteDetalhe.tsx).
  const [nome, setNome] = useState(cliente.nome)
  const [email, setEmail] = useState(cliente.email ?? '')
  const [telefone, setTelefone] = useState(cliente.telefone ?? '')
  const [nif, setNif] = useState(cliente.nif ?? '')
  const [notas, setNotas] = useState(cliente.notas ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    update.mutate({
      nome,
      email: email || null,
      telefone: telefone || null,
      nif: nif || null,
      notas: notas || null,
    })
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
            <Button type="submit" disabled={update.isPending}>
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