import { useState } from 'react'
import { useAuth } from '@/lib/use-auth'
import { useAlterarMinhaPassword } from '@/hooks/use-me'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function FormAlterarPassword() {
  const { logout } = useAuth()
  const alterarPwd = useAlterarMinhaPassword()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    if (next.length < 8) {
      setErro('A nova palavra-passe deve ter pelo menos 8 caracteres.')
      return
    }
    if (next !== confirm) {
      setErro('A confirmação não coincide com a nova palavra-passe.')
      return
    }
    if (next === current) {
      setErro('A nova palavra-passe deve ser diferente da atual.')
      return
    }

    try {
      await alterarPwd.mutateAsync({
        current_password: current,
        new_password: next,
      })
      setSucesso(true)
      setCurrent('')
      setNext('')
      setConfirm('')

      // Terminar sessão: os JWT atuais não são invalidados no backend,
      // por isso forçamos re-login com as novas credenciais.
      setTimeout(() => {
        logout()
        window.location.href = '/login'
      }, 800)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Erro ao alterar a palavra-passe.'
      setErro(detail)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alterar palavra-passe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submeter} className="space-y-3 max-w-md">
          <div className="space-y-1">
            <Label htmlFor="pwd-current">Palavra-passe atual</Label>
            <Input
              id="pwd-current"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={alterarPwd.isPending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pwd-next">Nova palavra-passe (mín. 8)</Label>
            <Input
              id="pwd-next"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={alterarPwd.isPending}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pwd-confirm">Confirmar nova palavra-passe</Label>
            <Input
              id="pwd-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={alterarPwd.isPending}
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {sucesso && (
            <p className="text-sm text-emerald-600">
              Palavra-passe alterada. A terminar sessão…
            </p>
          )}

          <Button
            type="submit"
            disabled={
              alterarPwd.isPending || !current || !next || !confirm
            }
          >
            {alterarPwd.isPending ? 'A alterar…' : 'Alterar palavra-passe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}