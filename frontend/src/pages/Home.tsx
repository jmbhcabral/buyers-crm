import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-primary">Buyers CRM</h1>
          <Button variant="outline" onClick={logout}>
            Sair
          </Button>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">
            Bem-vindo, {user?.nome} 👋
          </h2>
          <p className="text-muted-foreground">
            {user?.is_admin ? 'Administrador' : 'Consultor'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">{user?.email}</p>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          Dashboard, imóveis e clientes a chegar no próximo bloco.
        </p>
      </div>
    </div>
  )
}