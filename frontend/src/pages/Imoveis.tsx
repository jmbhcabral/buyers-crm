import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useImoveis } from '@/hooks/use-imoveis'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Search,
  AlertTriangle,
  Building2,
  Image as ImageIcon,
  Users,
  Eye,
} from 'lucide-react'

export default function Imoveis() {
  const [pesquisa, setPesquisa] = useState('')
  const [apenasConflitos, setApenasConflitos] = useState(false)

  const { data: imoveis, isLoading, isError } = useImoveis({
    q: pesquisa || undefined,
    apenasComConflitos: apenasConflitos,
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-muted-foreground">
            {imoveis ? `${imoveis.length} imóvel(is)` : 'A carregar...'}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por título ou ID do Idealista..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="conflitos"
                checked={apenasConflitos}
                onCheckedChange={setApenasConflitos}
              />
              <Label htmlFor="conflitos" className="cursor-pointer">
                Só com conflitos
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Erro ao carregar imóveis.</p>
          </CardContent>
        </Card>
      ) : imoveis && imoveis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Sem imóveis ainda</p>
              <p className="text-sm text-muted-foreground">
                Vai ao Idealista e usa o userscript para captar o primeiro.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Foto</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Fotos</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imoveis?.map((imovel) => (
                <TableRow key={imovel.id}>
                  <TableCell>
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-1">
                        {imovel.titulo || 'Sem título'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {imovel.property_id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {imovel.preco || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {imovel.localizacao?.join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {imovel.num_fotos}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {imovel.num_clientes}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {imovel.tem_conflitos ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Conflito
                      </Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/imoveis/${imovel.id}`}>
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
    </div>
  )
}