import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/use-auth'
import {
  useDashboardStats,
  useImoveisRecentes,
  usePdfsRecentes,
} from '@/hooks/use-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: imoveisRecentes } = useImoveisRecentes(5)
  const { data: pdfsRecentes } = usePdfsRecentes(5)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.nome} 👋
          </p>
        </div>
        <Button asChild>
          <Link to="/clientes">
            <Plus className="h-4 w-4 mr-2" />
            Novo cliente
          </Link>
        </Button>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imóveis</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? '—' : stats?.total_imoveis ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.imoveis_sem_cliente
                ? `${stats.imoveis_sem_cliente} sem cliente associado`
                : 'Todos com cliente'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? '—' : stats?.total_clientes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              na tua carteira
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDFs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? '—' : stats?.total_pdfs ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pdfs_ultimos_30_dias ?? 0} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflitos</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                (stats?.imoveis_com_conflitos ?? 0) > 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                (stats?.imoveis_com_conflitos ?? 0) > 0
                  ? 'text-destructive'
                  : ''
              }`}
            >
              {statsLoading ? '—' : stats?.imoveis_com_conflitos ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.imoveis_com_conflitos ?? 0) > 0
                ? 'Requer atenção'
                : 'Tudo sincronizado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imóveis recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Imóveis recentes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/imoveis">
                Ver todos
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!imoveisRecentes || imoveisRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sem imóveis ainda. Usa o userscript no Idealista.
              </p>
            ) : (
              <div className="space-y-2">
                {imoveisRecentes.map((i) => (
                  <Link
                    key={i.id}
                    to={`/imoveis/${i.id}`}
                    className="block p-2 border rounded hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">
                          {i.titulo || 'Sem título'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i.preco || '—'} · ID {i.property_id}
                        </p>
                      </div>
                      {i.tem_conflitos && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Conflito
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDFs recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDFs recentes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pdfs">
                Ver todos
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!pdfsRecentes || pdfsRecentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sem PDFs ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {pdfsRecentes.map((p) => (
                  <Link
                    key={p.id}
                    to={`/imoveis/${p.imovel_versao_id}`}
                    className="block p-2 border rounded hover:bg-muted/50 transition"
                  >
                    <p className="font-medium text-sm line-clamp-1">
                      {p.imovel_titulo || 'Sem título'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Para {p.cliente_nome} ·{' '}
                      {new Date(p.criado_em).toLocaleDateString('pt-PT')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}