import type { ReactNode } from 'react'
import type { ConsultorPublic } from '../types'

interface Props {
  children: ReactNode
  consultor?: ConsultorPublic | null
}

function formatarTelefone(t: string | null): string {
  if (!t) return ''
  const d = t.replace(/\D/g, '')
  if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  return t
}

export function Layout({ children, consultor }: Props) {
  const iniciais = (consultor?.nome || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {consultor ? (
            <div className="flex items-center gap-4">
              {/* Foto (80px) */}
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary-light flex items-center justify-center text-xl font-semibold shrink-0 ring-2 ring-white/20">
                {consultor.foto_url ? (
                  <img
                    key={consultor.foto_url}
                    src={consultor.foto_url}
                    alt={consultor.nome}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  iniciais
                )}
              </div>

              {/* Nome + Agência (centro) */}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight truncate">
                  {consultor.nome}
                </p>
                {consultor.agencia && (
                  <p className="text-sm text-blue-100 leading-tight truncate mt-0.5">
                    {consultor.agencia}
                  </p>
                )}
              </div>

              {/* Contactos (direita) */}
              <div className="text-right text-xs text-blue-100 shrink-0 space-y-1">
                {consultor.telefone && (
                  <p className="font-medium tabular-nums">
                    {formatarTelefone(consultor.telefone)}
                  </p>
                )}
                {consultor.email && (
                  <p
                    className="truncate max-w-[180px]"
                    title={consultor.email}
                  >
                    {consultor.email}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-lg font-bold">Imóveis Selecionados</h1>
              <p className="text-xs text-blue-100 mt-0.5">Para si</p>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4">
        {children}
      </main>
      <footer className="border-t bg-white py-4 mt-8">
        <p className="text-center text-xs text-gray-500">
          Seleção pessoal · Acesso privado
        </p>
      </footer>
    </div>
  )
}