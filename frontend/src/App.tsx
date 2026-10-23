import { Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/70">
      <div className="text-center text-primary-foreground">
        <h1 className="text-5xl font-bold mb-4">Buyers CRM</h1>
        <p className="text-lg opacity-90">Frontend em construção 🚧</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}