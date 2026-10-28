import { useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/lib/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'

export default function Header() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-2">
        <div className="text-right mr-2 hidden sm:block">
          <p className="text-sm font-medium leading-tight">{user?.nome}</p>
          <p className="text-xs text-muted-foreground">
            {user?.is_admin ? 'Administrador' : 'Consultor'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}