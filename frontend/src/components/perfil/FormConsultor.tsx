import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import { useAtualizarConsultor } from '@/hooks/use-consultor'
import type { Consultor } from '@/types'
import { notify } from '@/lib/toast'

interface Props {
  consultor: Consultor
}

export default function FormConsultor({ consultor }: Props) {
  const update = useAtualizarConsultor()

  const [telefone, setTelefone] = useState(consultor.telefone ?? '')
  const [nif, setNif] = useState(consultor.nif ?? '')
  const [bio, setBio] = useState(consultor.bio ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    update.mutate({
      telefone: telefone || null,
      nif: nif || null,
      bio: bio || null,
    }, {
      onSuccess: () => notify.sucesso('Consultor atualizado.'),
      onError: () => notify.erro('Erro ao atualizar consultor.'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados profissionais</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="912 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input
                id="nif"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Uma breve descrição que aparece no rodapé dos PDFs"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}