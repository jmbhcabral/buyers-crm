export interface Consultor {
  id: number
  user_id: number
  telefone: string | null
  nif: string | null
  bio: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface User {
  id: number
  email: string
  nome: string
  is_admin: boolean
  ativo: boolean
  criado_em: string
  consultor: Consultor | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

// ===========================================================================
// Imóveis
// ===========================================================================

export interface Foto {
  id: number
  idealista_id: number | null
  ordem: number
  url_original: string | null
  url_webp: string | null
  caminho_local: string | null
  largura: number | null
  altura: number | null
  tag: string | null
  titulo: string | null
  ativa: boolean
}

export interface ImovelCanonico {
  id: number
  property_id: string
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  descricao: string | null
  url: string | null
  ad_external_reference: string | null
  ad_commercial_name: string | null
  ad_professional_name: string | null
  anunciante: string | null
  referencia_anunciante: string | null
  caracteristicas: any[] | null
  caracteristicas_especificas: any[] | null
  plantas: any[] | null
  videos: any[] | null
  tours_virtuais: any[] | null
  contagens: Record<string, any> | null
  telefone: Record<string, any> | null
  extraido_em: string
  criado_em: string
  atualizado_em: string
  fotos?: Foto[]
}

export interface ImovelVersaoListItem {
  id: number
  imovel_canonico_id: number
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  tem_conflitos: boolean
  atualizado_em: string
  criado_em: string
  property_id: string
  num_fotos: number
  num_clientes: number
}

export interface ImovelVersao {
  id: number
  imovel_canonico_id: number
  consultor_id: number
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  descricao: string | null
  anunciante: string | null
  caracteristicas: any[] | null
  caracteristicas_especificas: any[] | null
  telefone: Record<string, any> | null
  notas_internas: string | null
  campos_alterados: Record<string, boolean> | null
  tem_conflitos: boolean
  sincronizado_em: string | null
  criado_em: string
  atualizado_em: string
}

export interface ImovelVersaoComDetalhes extends ImovelVersao {
  canonico: ImovelCanonico
}