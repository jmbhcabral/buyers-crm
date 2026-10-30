import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold">Imóveis Selecionados</h1>
          <p className="text-xs text-blue-100 mt-0.5">Para si</p>
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