import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, Upload, Trash2 } from 'lucide-react'
import { useAtualizarConsultor } from '@/hooks/use-consultor'
import {
  useAtualizarMeuUser,
  useUploadFotoPerfil,
  useApagarFotoPerfil,
} from '@/hooks/use-me'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { notify } from '@/lib/toast'
import { useAuth } from '@/lib/use-auth'
import type { Consultor } from '@/types'

interface Props {
  consultor: Consultor
}

export default function FormConsultor({ consultor }: Props) {
  const { user, refreshUser } = useAuth()
  const updateConsultor = useAtualizarConsultor()
  const updateUser = useAtualizarMeuUser()
  const uploadFoto = useUploadFotoPerfil()
  const apagarFoto = useApagarFotoPerfil()

  const fileRef = useRef<HTMLInputElement>(null)
  const [nome, setNome] = useState(user?.nome ?? '')
  const [agencia, setAgencia] = useState(consultor.agencia ?? '')
  const [telefone, setTelefone] = useState(consultor.telefone ?? '')
  const [nif, setNif] = useState(consultor.nif ?? '')
  const [bio, setBio] = useState(consultor.bio ?? '')
  const [confirmApagarFoto, setConfirmApagarFoto] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      // 1. Atualizar nome (User) se mudou
      if (user && nome !== user.nome) {
        await updateUser.mutateAsync({ nome })
        await refreshUser()   // <-- Header passa a mostrar o nome novo
      }
      // 2. Atualizar dados do consultor
      await updateConsultor.mutateAsync({
        agencia: agencia || null,
        telefone: telefone || null,
        nif: nif || null,
        bio: bio || null,
      })
      notify.sucesso('Perfil atualizado.')
    } catch (e: any) {
      notify.erro(e?.response?.data?.detail ?? 'Erro ao guardar.')
    }
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    uploadFoto.mutate(f, {
      onSuccess: () => notify.sucesso('Foto atualizada.'),
      onError: (err: any) =>
        notify.erro(err?.response?.data?.detail ?? 'Erro ao enviar a foto.'),
    })
    e.target.value = ''
  }

  function handleApagarFoto() {
    apagarFoto.mutate(undefined, {
      onSuccess: () => {
        notify.sucesso('Foto removida.')
        setConfirmApagarFoto(false)
      },
      onError: () => notify.erro('Erro ao remover a foto.'),
    })
  }

  const poupando = updateConsultor.isPending || updateUser.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados profissionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center text-2xl text-muted-foreground">
              {consultor.foto_url ? (
                <img
                  key={consultor.foto_url}   // força o React a recriar o <img> quando o URL muda
                  src={consultor.foto_url}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                nome.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFotoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploadFoto.isPending}
              >
                {uploadFoto.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1" />
                )}
                {consultor.foto_url ? 'Trocar foto' : 'Carregar foto'}
              </Button>
              {consultor.foto_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmApagarFoto(true)}
                  disabled={apagarFoto.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remover foto
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                JPEG, PNG ou WebP · máx. 5MB
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  value={agencia}
                  onChange={(e) => setAgencia(e.target.value)}
                  placeholder="Ex: Remax"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="912 345 678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input
                id="nif"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Breve descrição (não aparece na app pública)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={poupando}>
                {poupando ? (
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

      <ConfirmDialog
        open={confirmApagarFoto}
        onOpenChange={setConfirmApagarFoto}
        titulo="Remover foto?"
        descricao="A foto de perfil deixa de aparecer no CRM e na app dos clientes."
        textoConfirmar="Remover"
        onConfirm={handleApagarFoto}
      />
    </>
  )
}