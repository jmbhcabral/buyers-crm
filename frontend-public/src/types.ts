export type EstadoImovel =
  | 'disponivel' | 'reservado' | 'cpcv'
  | 'escritura_marcada' | 'vendido' | 'saiu_mercado'

export type TipoInteracao = 'interesse' | 'pedido_visita' | 'pedido_info'
export type EstadoInteracao = 'pendente' | 'visto' | 'concluido' | 'cancelado'


export interface ConsultorPublic {
  id: number
  nome: string
  agencia: string | null
  email: string | null
  telefone: string | null
  foto_url: string | null
}

export interface PublicLinkInfo {
  cliente_nome_mascarado: string
  expira_em: string
}

export interface PublicImovelItem {
  imovel_versao_id: number
  ordem: number
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  num_fotos: number
  primeira_foto_url: string | null
  estado_imovel: EstadoImovel
}

export interface PublicLinkResponse {
  link: PublicLinkInfo
  imoveis: PublicImovelItem[]
  consultor: ConsultorPublic | null
}

export interface PublicFoto {
  id: number
  ordem: number
  url: string
  largura: number | null
  altura: number | null
  tag: string | null
  titulo: string | null
}

export interface PublicImovelDetalhe {
  imovel_versao_id: number
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  descricao: string | null
  caracteristicas: Array<{ nome: string; valor: string; subtexto: string | null }> | null
  caracteristicas_especificas: string[] | null
  telefone: any
  url_original: string | null
  fotos: PublicFoto[]
  consultor: ConsultorPublic | null
  estado_imovel: EstadoImovel
}


export interface Interacao {
  id: number
  cliente_id: number
  imovel_versao_id: number
  tipo: TipoInteracao
  estado: EstadoInteracao
  payload: Record<string, any> | null
  lida_pelo_consultor: boolean
  lida_pelo_cliente: boolean
  criado_em: string
  atualizado_em: string
}

export interface Nota {
  id: number
  cliente_id: number
  imovel_versao_id: number | null
  autor_tipo: 'cliente' | 'consultor'
  autor_user_id: number | null
  conteudo: string
  lida_pelo_destinatario: boolean
  criado_em: string
}

export interface InteracoesResumo {
  interesses: number[]
  pedidos: Interacao[]
  notas_nao_lidas: number
  por_imovel: Record<number, { interesse: number; pedidos: number }>
}