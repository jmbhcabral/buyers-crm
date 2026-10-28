import { useState } from 'react'
import { usePdfs, useApagarPdf, descarregarPdf } from '@/hooks/use-pdfs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Loader2,
  Search,
  FileText,
  Download,
  Trash2,
  Calendar,
} from 'lucide-react'
import { notify } from '@/lib/toast'

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Pdfs() {
  const [pesquisa, setPesquisa] = useState('')
  const [aApagar, setAApagar] = useState<number | null>(null)
  const { data: pdfs, isLoading } = usePdfs({ q: pesquisa || undefined })
  const apagar = useApagarPdf()

  async function handleDownload(pdfId: number, nome: string) {
    try {
      await descarregarPdf(pdfId, nome)
      notify.sucesso('PDF descarregado.')
    } catch (err) {
      console.error('Erro ao descarregar PDF:', err)
      notify.erro('Erro ao descarregar o PDF.')
    }
  }

  function handleApagar(pdfId: number) {
    setAApagar(pdfId)
  }

  function confirmarApagar() {
    if (aApagar === null) return
    apagar.mutate(aApagar, {
      onSuccess: () => {
        notify.sucesso('PDF apagado.')
        setAApagar(null)
      },
      onError: () => notify.erro('Erro ao apagar o PDF.'),
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PDFs</h1>
        <p className="text-muted-foreground">
          {pdfs ? `${pdfs.length} PDF(s)` : 'A carregar...'}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por imóvel ou cliente..."
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
      ) : !pdfs || pdfs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Sem PDFs ainda</p>
              <p className="text-sm text-muted-foreground">
                Vai ao detalhe de um imóvel e gera o primeiro.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdfs.map((pdf) => (
                <TableRow key={pdf.id}>
                  <TableCell>
                    <p className="font-medium line-clamp-1">
                      {pdf.imovel_titulo || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {pdf.imovel_property_id}
                    </p>
                  </TableCell>
                  <TableCell>{pdf.cliente_nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatarTamanho(pdf.tamanho_bytes)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(pdf.criado_em).toLocaleDateString('pt-PT')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(pdf.id, pdf.nome_ficheiro)}
                      title="Descarregar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApagar(pdf.id)}
                      title="Apagar"
                      disabled={apagar.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmDialog
        open={aApagar !== null}
        onOpenChange={(open) => !open && setAApagar(null)}
        titulo="Apagar PDF?"
        descricao="O ficheiro é removido do servidor e não pode ser recuperado."
        textoConfirmar="Apagar"
        onConfirm={confirmarApagar}
      />
    </div>
  )
}