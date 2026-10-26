import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useImovel } from '@/hooks/use-imovel'
import { useClientesDoImovel } from '@/hooks/use-clientes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText,
  Calendar,
} from 'lucide-react'
import FormImovel from '@/components/imovel/FormImovel'
import SnapshotCanonico from '@/components/imovel/SnapshotCanonico'
import GaleriaFotos from '@/components/imovel/GaleriaFotos'
import ClientesAssociados from '@/components/imovel/ClientesAssociados'

export default function ImovelDetalhe() {
  const { id } = useParams()
  const versaoId = Number(id)
  const { data: imovel, isLoading, isError } = useImovel(versaoId)
  const { data: clientes } = useClientesDoImovel(versaoId)
  const [clientePdf, setClientePdf] = useState<string>('')

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !imovel) {
    return (
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" asChild>
          <Link to="/imoveis">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Imóvel não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function gerarPdf() {
    if (!clientePdf) return

    try {
      const resp = await fetch(
        `/api/imoveis/${versaoId}/pdf?cliente_id=${clientePdf}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      )

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `imovel_${versaoId}_cliente_${clientePdf}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar o PDF. Tenta novamente.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Voltar */}
      <Button variant="ghost" asChild>
        <Link to="/imoveis">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Link>
      </Button>

      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold line-clamp-2">
              {imovel.titulo || 'Sem título'}
            </h1>
            <p className="text-muted-foreground">
              ID: {imovel.canonico.property_id}
            </p>
          </div>
          {imovel.tem_conflitos && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Conflito
            </Badge>
          )}
        </div>
        {imovel.sincronizado_em && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Sincronizado em{' '}
            {new Date(imovel.sincronizado_em).toLocaleString('pt-PT')}
          </p>
        )}
      </div>

      {/* Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium flex-1">
              Gerar PDF do imóvel para um cliente
            </p>
            <div className="flex gap-2">
              <Select value={clientePdf} onValueChange={setClientePdf}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Escolher cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {(clientes ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={gerarPdf} disabled={!clientePdf}>
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
          {(!clientes || clientes.length === 0) && (
            <p className="text-xs text-muted-foreground mt-2">
              Associa um cliente primeiro para poderes gerar o PDF.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FormImovel imovel={imovel} />
          <GaleriaFotos fotos={imovel.canonico.fotos ?? []} imovelId={versaoId} />
        </div>
        <div className="space-y-6">
          <ClientesAssociados versaoId={versaoId} />
          <SnapshotCanonico canonico={imovel.canonico} />
        </div>
      </div>
    </div>
  )
}