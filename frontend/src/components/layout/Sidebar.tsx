import { NavLink } from 'react-router-dom'
import { Building2, Users, LayoutDashboard, Link2,  User, Shield, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/imoveis', label: 'Imóveis', icon: Building2 },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/links', label: 'Links', icon: Link2 },
  { to: '/pdfs', label: 'PDFs', icon: FileText },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="w-64 bg-primary text-primary-foreground flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <h1 className="text-lg font-bold">Buyers CRM</h1>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/30 text-white'
                  : 'text-primary-foreground/80 hover:bg-white/15 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {user?.is_admin && (
          <>
            <div className="pt-4 mt-4 border-t border-white/10">
              <p className="px-3 text-xs uppercase tracking-wider text-primary-foreground/50">
                Administração
              </p>
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/30 text-white'
                    : 'text-primary-foreground/80 hover:bg-white/15 hover:text-white',
                )
              }
            >
              <Shield className="h-4 w-4" />
              Admin
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-primary-foreground/50">
        v0.1.0
      </div>
    </aside>
  )
}