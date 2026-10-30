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
}

export interface PublicLinkResponse {
  link: PublicLinkInfo
  imoveis: PublicImovelItem[]
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
  anunciante: string | null
  caracteristicas: Array<{ nome: string; valor: string; subtexto: string | null }> | null
  caracteristicas_especificas: string[] | null
  telefone: any
  url_original: string | null
  fotos: PublicFoto[]
}