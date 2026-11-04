import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Equipa } from '@/types'
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
  Users2,
  Building2,
  FileText,
  History,
  AlertTriangle,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useCriarConsultorAdmin,
  useAlterarCredenciaisConsultor,
} from '@/hooks/use-admin-consultores'
import {
  useAdminEquipas,
  useEquipa,
  useCriarEquipa,
  useApagarEquipa,
  useAdicionarMembro,
  useRemoverMembro,
} from '@/hooks/use-equipas'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/toast'

type Tab =
  | 'stats'
  | 'consultores'
  | 'equipas'
  | 'canonicos'
  | 'versoes'
  | 'historico'
  | 'pdfs'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('stats')

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'stats', label: 'Resumo', icon: FileText },
    { id: 'consultores', label: 'Consultores', icon: Users },
    { id: 'equipas', label: 'Equipas', icon: Users2 },
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
      {tab === 'equipas' && <EquipasTab />}
      {tab === 'canonicos' && <CanonicosTab />}
      {tab === 'versoes' && <VersoesTab />}
      {tab === 'historico' && <HistoricoTab />}
      {tab === 'pdfs' && <PdfsTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Equipas
// ---------------------------------------------------------------------------
function EquipasTab() {
  const { data: equipas, isLoading } = useAdminEquipas()
  const [criarOpen, setCriarOpen] = useState(false)
  const [detalheId, setDetalheId] = useState<number | null>(null)
  const [confirmApagar, setConfirmApagar] = useState<Equipa | null>(null)
  const apagar = useApagarEquipa()

  if (isLoading) return <Loading />

  function confirmarApagar() {
    if (!confirmApagar) return
    apagar.mutate(confirmApagar.id, {
      onSuccess: () => {
        notify.sucesso('Equipa apagada.')
        setConfirmApagar(null)
      },
      onError: () => notify.erro('Erro ao apagar equipa.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCriarOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova equipa
        </Button>
      </div>

      {(!equipas || equipas.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sem equipas. Cria a primeira para começar.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Consultores</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell className="text-center">{e.num_consultores}</TableCell>
                  <TableCell className="text-center">{e.num_clientes}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(e.criado_em).toLocaleDateString('pt-PT')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetalheId(e.id)}
                    >
                      Gerir membros
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmApagar(e)}
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

      <DialogNovoEquipa open={criarOpen} onOpenChange={setCriarOpen} />

      <DialogGerirEquipa
        equipaId={detalheId}
        onClose={() => setDetalheId(null)}
      />

      <ConfirmDialog
        open={!!confirmApagar}
        onOpenChange={(v) => !v && setConfirmApagar(null)}
        titulo="Apagar equipa?"
        descricao="Os consultores e clientes ficam sem equipa (voltam a ser pessoais). Os links mantêm-se."
        textoConfirmar="Apagar"
        onConfirm={confirmarApagar}
      />
    </div>
  )
}

function DialogNovoEquipa({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const criar = useCriarEquipa()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await criar.mutateAsync({ nome: nome.trim() })
      setNome('')
      notify.sucesso('Equipa criada.')
      onOpenChange(false)
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao criar equipa.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova equipa</DialogTitle>
        </DialogHeader>
        <form onSubmit={submeter} className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending || !nome.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogGerirEquipa({
  equipaId,
  onClose,
}: {
  equipaId: number | null
  onClose: () => void
}) {
  const { data: equipa, isLoading } = useEquipa(equipaId)
  const { data: consultores } = useAdminConsultores()
  const adicionar = useAdicionarMembro()
  const remover = useRemoverMembro()
  const [novoMembro, setNovoMembro] = useState<string>('')
  const [erro, setErro] = useState<string | null>(null)

  const membrosIds = new Set(equipa?.consultores.map((m) => m.id) ?? [])
  const disponiveis = (consultores ?? []).filter(
    (c) => !membrosIds.has(c.id)
  )

  async function handleAdicionar() {
    if (!equipaId || !novoMembro) return
    setErro(null)
    try {
      await adicionar.mutateAsync({
        equipaId,
        consultorId: Number(novoMembro),
      })
      setNovoMembro('')
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao adicionar membro.')
    }
  }

  async function handleRemover(consultorId: number) {
    if (!equipaId) return
    setErro(null)
    try {
      await remover.mutateAsync({ equipaId, consultorId })
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao remover membro.')
    }
  }

  return (
    <Dialog open={!!equipaId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Membros — {equipa?.nome ?? '…'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Loading />
        ) : !equipa ? (
          <p className="text-sm text-muted-foreground">Equipa não encontrada.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Membros</Label>
              {equipa.consultores.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Sem membros. Adiciona consultores abaixo.
                </p>
              ) : (
                <ul className="mt-2 divide-y border rounded">
                  {equipa.consultores.map((m) => {
                    const consultor = consultores?.find((c) => c.id === m.id)
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span>
                          {consultor?.nome ?? `#${m.id}`}{' '}
                          <span className="text-muted-foreground">
                            ({consultor?.email ?? '—'})
                          </span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemover(m.id)}
                          disabled={remover.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label>Adicionar consultor</Label>
              <div className="flex gap-2">
                <Select value={novoMembro} onValueChange={setNovoMembro}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Escolher consultor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {disponiveis.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Sem consultores disponíveis
                      </SelectItem>
                    ) : (
                      disponiveis.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAdicionar}
                  disabled={!novoMembro || adicionar.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Consultores (inalterado)
// ---------------------------------------------------------------------------
function ConsultoresTab() {
  const { data, isLoading } = useAdminConsultores()
  const [novoOpen, setNovoOpen] = useState(false)
  const [credOpen, setCredOpen] = useState<{ id: number; nome: string } | null>(null)

  if (isLoading) return <Loading />
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNovoOpen(true)}>Novo consultor</Button>
      </div>

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
              <TableHead className="text-right">Ações</TableHead>
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
                <TableCell className="text-sm text-muted-foreground">
                  {c.email}
                </TableCell>
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
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCredOpen({ id: c.id, nome: c.nome })}
                  >
                    Credenciais
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <DialogNovoConsultor open={novoOpen} onOpenChange={setNovoOpen} />
      <DialogCredenciais
        consultor={credOpen}
        onClose={() => setCredOpen(null)}
      />
    </div>
  )
}

function DialogNovoConsultor({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const criar = useCriarConsultorAdmin()
  const [form, setForm] = useState({
    email: '',
    password: '',
    nome: '',
    telefone: '',
    agencia: '',
  })
  const [erro, setErro] = useState<string | null>(null)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await criar.mutateAsync({
        email: form.email,
        password: form.password,
        nome: form.nome,
        telefone: form.telefone || null,
        agencia: form.agencia || null,
      })
      setForm({ email: '', password: '', nome: '', telefone: '', agencia: '' })
      onOpenChange(false)
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao criar consultor')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo consultor</DialogTitle>
        </DialogHeader>
        <form onSubmit={submeter} className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Password (mín. 8)</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div>
              <Label>Agência</Label>
              <Input
                value={form.agencia}
                onChange={(e) => setForm({ ...form, agencia: e.target.value })}
              />
            </div>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DialogCredenciais({
  consultor,
  onClose,
}: {
  consultor: { id: number; nome: string } | null
  onClose: () => void
}) {
  const alterar = useAlterarCredenciaisConsultor()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!consultor) return
    setErro(null)
    try {
      await alterar.mutateAsync({
        consultorId: consultor.id,
        payload: {
          email: email || undefined,
          new_password: password || undefined,
        },
      })
      setEmail('')
      setPassword('')
      onClose()
    } catch (err: any) {
      setErro(err?.response?.data?.detail ?? 'Erro ao alterar credenciais')
    }
  }

  return (
    <Dialog open={!!consultor} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credenciais — {consultor?.nome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submeter} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deixa em branco o que não queres alterar. O consultor terá de
            voltar a autenticar-se.
          </p>
          <div>
            <Label>Novo email</Label>
            <Input
              type="email"
              placeholder="(manter atual)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Nova password (mín. 8)</Label>
            <Input
              type="password"
              minLength={8}
              placeholder="(manter atual)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={alterar.isPending || (!email && !password)}
            >
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Restantes (inalteradas)
// ---------------------------------------------------------------------------
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