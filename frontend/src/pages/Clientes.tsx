import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClientes } from '@/hooks/use-clientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Search, UserPlus, Eye, Users, Mail, Phone } from 'lucide-react'
import DialogNovoCliente from '@/components/cliente/DialogNovoCliente'

export default function Clientes() {
  const [pesquisa, setPesquisa] = useState('')
  const [dialogAberto, setDialogAberto] = useState(false)
  const { data: clientes, isLoading } = useClientes({ q: pesquisa || undefined })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {clientes ? `${clientes.length} cliente(s)` : 'A carregar...'}
          </p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo cliente
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou email..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !clientes || clientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Sem clientes ainda</p>
              <p className="text-sm text-muted-foreground">
                Cria o primeiro cliente para começares a associar imóveis.
              </p>
            </div>
            <Button onClick={() => setDialogAberto(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo cliente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm">
                    {c.email ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.telefone ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {c.telefone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/clientes/${c.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <DialogNovoCliente open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  )
}