import { toast } from 'sonner'

export const notify = {
  sucesso: (mensagem: string) => toast.success(mensagem),
  erro: (mensagem: string) => toast.error(mensagem),
  info: (mensagem: string) => toast.info(mensagem),
  aviso: (mensagem: string) => toast.warning(mensagem),
}