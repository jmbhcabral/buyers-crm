import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useAdminStats,
  useAdminConsultores,
  useAdminCanonicos,
  useAdminVersoes,
  useAdminHistorico,
  useAdminPdfs,
} from '@/hooks/use-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  Users,
  Building2,
  FileText,
  History,
  AlertTriangle,
} from 'lucide-react'

type Tab = 'stats' | 'consultores' | 'canonicos' | 'versoes' | 'historico' | 'pdfs'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('stats')

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'stats', label: 'Resumo', icon: FileText },
    { id: 'consultores', label: 'Consultores', icon: Users },
    { id: 'canonicos', label: 'Canónicos', icon: Building2 },
    { id: 'versoes', label: 'Versões', icon: Building2 },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'pdfs', label: 'PDFs', icon: FileText },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-muted-foreground">Auditoria e gestão global do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'consultores' && <ConsultoresTab />}
      {tab === 'canonicos' && <CanonicosTab />}
      {tab === 'versoes' && <VersoesTab />}
      {tab === 'historico' && <HistoricoTab />}
      {tab === 'pdfs' && <PdfsTab />}
    </div>
  )
}

function StatsTab() {
  const { data, isLoading } = useAdminStats()
  if (isLoading) return <Loading />
  if (!data) return null

  const cards = [
    { label: 'Utilizadores', value: data.total_users },
    { label: 'Consultores', value: data.total_consultores },
    { label: 'Clientes', value: data.total_clientes },
    { label: 'Canónicos', value: data.total_canonicos },
    { label: 'Versões', value: data.total_versoes },
    { label: 'PDFs', value: data.total_pdfs },
    { label: 'Captações (histórico)', value: data.total_historico },
    { label: 'Ingest 7 dias', value: data.ingest_ultimos_7_dias },
    { label: 'PDFs 7 dias', value: data.pdfs_ultimos_7_dias },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {cards.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ConsultoresTab() {
  const { data, isLoading } = useAdminConsultores()
  if (isLoading) return <Loading />
  if (!data) return null

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="text-center">Imóveis</TableHead>
            <TableHead className="text-center">Clientes</TableHead>
            <TableHead className="text-center">PDFs</TableHead>
            <TableHead className="text-center">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                {c.nome}
                {c.is_admin && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    admin
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
              <TableCell className="text-sm">{c.telefone || '—'}</TableCell>
              <TableCell className="text-center">{c.num_imoveis}</TableCell>
              <TableCell className="text-center">{c.num_clientes}</TableCell>
              <TableCell className="text-center">{c.num_pdfs}</TableCell>
              <TableCell className="text-center">
                {c.ativo ? (
                  <Badge variant="secondary">ativo</Badge>
                ) : (
                  <Badge variant="destructive">inativo</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function CanonicosTab() {
  const [pesquisa, setPesquisa] = useState('')
  const { data, isLoading } = useAdminCanonicos(pesquisa || undefined)

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título ou ID..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState text="Sem canónicos." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Idealista</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-center">Fotos</TableHead>
                <TableHead className="text-center">Versões</TableHead>
                <TableHead>Capturado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.property_id}</TableCell>
                  <TableCell className="font-medium line-clamp-1">
                    {c.titulo || '—'}
                  </TableCell>
                  <TableCell>{c.preco || '—'}</TableCell>
                  <TableCell className="text-center">{c.num_fotos}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={c.num_versoes > 0 ? 'secondary' : 'outline'}>
                      {c.num_versoes}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.extraido_em).toLocaleDateString('pt-PT')}
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

function VersoesTab() {
  const [consultorId, setConsultorId] = useState<string>('')
  const [pesquisa, setPesquisa] = useState('')
  const { data: consultores } = useAdminConsultores()
  const { data, isLoading } = useAdminVersoes(
    consultorId ? Number(consultorId) : undefined,
    pesquisa || undefined
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por título ou ID..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={consultorId || 'all'}
              onValueChange={(v) => setConsultorId(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Todos os consultores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os consultores</SelectItem>
                {(consultores ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <EmptyState text="Sem versões." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>ID Idealista</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium line-clamp-1">
                    {v.titulo || '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.property_id}</TableCell>
                  <TableCell>
                    <p className="text-sm">{v.consultor_nome}</p>
                    <p className="text-xs text-muted-foreground">{v.consultor_email}</p>
                  </TableCell>
                  <TableCell>{v.preco || '—'}</TableCell>
                  <TableCell className="text-center">
                    {v.tem_conflitos ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Conflito
                      </Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/imoveis/${v.id}`} className="text-primary hover:underline text-sm">
                      Ver
                    </Link>
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

function HistoricoTab() {
  const { data, isLoading } = useAdminHistorico()
  if (isLoading) return <Loading />
  if (!data || data.length === 0) return <EmptyState text="Sem histórico de captações." />

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Idealista</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Capturado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="font-mono text-xs">{h.property_id}</TableCell>
              <TableCell className="font-medium line-clamp-1">
                {h.imovel_titulo || '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(h.capturado_em).toLocaleString('pt-PT')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function PdfsTab() {
  const { data, isLoading } = useAdminPdfs()
  if (isLoading) return <Loading />
  if (!data || data.length === 0) return <EmptyState text="Sem PDFs gerados." />

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imóvel</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Consultor</TableHead>
            <TableHead>Criado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium line-clamp-1">
                {p.imovel_titulo || '—'}
              </TableCell>
              <TableCell className="font-mono text-xs">{p.property_id}</TableCell>
              <TableCell>{p.cliente_nome}</TableCell>
              <TableCell className="text-sm">{p.consultor_nome}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.criado_em).toLocaleString('pt-PT')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  )
}