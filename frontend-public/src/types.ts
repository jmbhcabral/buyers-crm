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
  e_comprador: boolean
  e_vendedor: boolean
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

export interface PublicImovelVendedorItem extends PublicImovelItem {
  num_visitas: number
  rating_global_medio: number | null
  ultima_visita_em: string | null
}

export interface PublicLinkResponse {
  link: PublicLinkInfo
  imoveis: PublicImovelItem[]
  imoveis_vendedor: PublicImovelVendedorItem[]
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

/**
 * Características "principais" (Idealista: nome/valor; Supercasa: nome/valor).
 * `subtexto` é opcional — o Supercasa não o envia.
 */
export interface CaracteristicaPrincipal {
  nome: string
  valor: string
  subtexto?: string | null
}

/**
 * Características "específicas": no Idealista chegam como `string[]`
 * (lista plana); no Supercasa chegam agrupadas como
 * `{ grupo, itens[] }[]`. O backend devolve o formato da plataforma
 * de origem — o frontend tem de lidar com os dois.
 */
export type CaracteristicaEspecifica =
  | string
  | { grupo: string; itens: string[] }

export interface PublicImovelDetalhe {
  imovel_versao_id: number
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  descricao: string | null
  caracteristicas: CaracteristicaPrincipal[] | null
  caracteristicas_especificas: CaracteristicaEspecifica[] | null
  telefone: unknown
  url_original: string | null
  fotos: PublicFoto[]
  consultor: ConsultorPublic | null
  estado_imovel: EstadoImovel
  e_angariacao: boolean
}


export interface Interacao {
  id: number
  cliente_id: number
  imovel_versao_id: number
  tipo: TipoInteracao
  estado: EstadoInteracao
  payload: Record<string, unknown> | null
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


// ===========================================================================
// Portal do vendedor
// ===========================================================================

export type VisitanteOrigem =
  | 'agencia_externa' | 'particular' | 'cliente_proprio' | 'walk_in' | 'outro'

export interface VisitaPublic {
  id: number
  data_visita: string
  visitante_origem: VisitanteOrigem
  gostou: string | null
  nao_gostou: string | null
  observacoes: string | null
  rating_areas: number
  rating_acabamentos: number
  rating_localizacao: number
  rating_apresentacao: number
  rating_preco: number
  rating_global: number
  compraria: boolean
}

export interface RatingsMedios {
  areas: number | null
  acabamentos: number | null
  localizacao: number | null
  apresentacao: number | null
  preco: number | null
  global: number | null
}

export interface EstatisticasVendedor {
  imovel_versao_id: number
  num_visitas: number
  rating_global_medio: number | null
  ratings_medios: RatingsMedios
  compraria_sim: number
  compraria_nao: number
  visitas: VisitaPublic[]
  plataformas: unknown[]
}