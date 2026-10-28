import { useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Copy, Check } from 'lucide-react'
import { useCriarApiKey } from '@/hooks/use-api-keys'
import type { ApiKeyCreated } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function DialogNovaApiKey({ open, onOpenChange }: Props) {
  const criar = useCriarApiKey()
  const [nome, setNome] = useState('')
  const [criada, setCriada] = useState<ApiKeyCreated | null>(null)
  const [copiada, setCopiada] = useState(false)

  function reset() {
    setNome('')
    setCriada(null)
    setCopiada(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    try {
      const api_key = await criar.mutateAsync(nome.trim())
      setCriada(api_key)
    } catch (err) {
      console.error('Erro ao criar API key:', err)
      alert('Erro ao criar API key.')
    }
  }

  async function copiar() {
    if (!criada) return
    try {
      await navigator.clipboard.writeText(criada.chave)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch {
      alert('Não consegui copiar. Copia manualmente.')
    }
  }

  function handleClose(aberto: boolean) {
    if (!aberto) reset()
    onOpenChange(aberto)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {!criada ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova API key</DialogTitle>
              <DialogDescription>
                Usa esta chave no userscript (Tampermonkey) para enviares imóveis do Idealista.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome (para identificares o dispositivo)</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Tampermonkey - MacBook"
                  disabled={criar.isPending}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={criar.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={criar.isPending || !nome.trim()}>
                  {criar.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Criar
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API key criada</DialogTitle>
              <DialogDescription className="text-red-600 font-medium">
                ⚠️ Copia a chave agora. Não vai aparecer outra vez.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="p-3 bg-muted rounded font-mono text-xs break-all">
                {criada.chave}
              </div>

              <Button onClick={copiar} className="w-full">
                {copiada ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar chave
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Nome: <strong>{criada.nome}</strong>
                <br />
                Prefixo: <code>{criada.prefixo}...</code>
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}