import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/use-auth'
import { useMeuConsultor } from '@/hooks/use-consultor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormConsultor from '@/components/perfil/FormConsultor'
import ListaApiKeys from '@/components/perfil/ListaApiKeys'
import FormAlterarPassword from '@/components/perfil/FormAlterarPassword'

export default function Perfil() {
  const { user } = useAuth()
  const { data: consultor, isLoading } = useMeuConsultor()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">
          {user?.nome} · {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {isLoading ? (
            <Card>
              <CardContent className="py-12 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : consultor ? (
            <FormConsultor key={consultor.id} consultor={consultor} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sem perfil de consultor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A tua conta não tem perfil de consultor. Contacta o administrador.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <ListaApiKeys />
        </div>
      </div>

      {/* Secção de credenciais — comum a consultores e admins */}
      <div className="max-w-md">
        <FormAlterarPassword />
      </div>
    </div>
  )
}