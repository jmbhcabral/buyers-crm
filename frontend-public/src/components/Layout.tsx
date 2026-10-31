import type { ReactNode } from 'react'
import type { ConsultorPublic } from '../types'

interface Props {
  children: ReactNode
  consultor?: ConsultorPublic | null
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
        <div className="max-w-2xl mx-auto px-4 py-3">
          {consultor ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-light flex items-center justify-center text-sm font-semibold shrink-0">
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight truncate">
                  {consultor.nome}
                </p>
                {consultor.agencia && (
                  <p className="text-xs text-blue-100 leading-tight truncate">
                    {consultor.agencia}
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