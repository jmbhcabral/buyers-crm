export interface Consultor {
  id: number
  user_id: number
  telefone: string | null
  nif: string | null
  bio: string | null
  agencia: string | null
  foto_url: string | null
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
  primeira_foto_id: number | null
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

// ===========================================================================
// Clientes
// ===========================================================================
export interface Cliente {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  nif: string | null
  notas: string | null
  criado_em: string
  atualizado_em: string
}

export interface ClienteAssociado {
  id: number
  nome: string
  email: string | null
  telefone: string | null
}

export interface ImovelVersaoComDetalhes extends ImovelVersao {
  canonico: ImovelCanonico
}

// ===========================================================================
// PDFs
// ===========================================================================
export interface PdfGerado {
  id: number
  imovel_versao_id: number
  cliente_id: number
  nome_ficheiro: string
  tamanho_bytes: number
  criado_em: string
}

export interface PdfGeradoComContexto extends PdfGerado {
  imovel_titulo: string | null
  imovel_property_id: string
  cliente_nome: string
}

// ===========================================================================
// API Keys
// ===========================================================================
export interface ApiKey {
  id: number
  nome: string
  prefixo: string
  ativa: boolean
  ultimo_uso_em: string | null
  criado_em: string
}

export interface ApiKeyCreated extends ApiKey {
  chave: string
}

// ===========================================================================
// Dashboard
// ===========================================================================
export interface DashboardStats {
  total_imoveis: number
  total_clientes: number
  total_pdfs: number
  imoveis_com_conflitos: number
  imoveis_sem_cliente: number
  pdfs_ultimos_30_dias: number
}

export interface ImovelRecente {
  id: number
  titulo: string | null
  preco: string | null
  property_id: string
  criado_em: string
  tem_conflitos: boolean
}

export interface PdfRecente {
  id: number
  imovel_versao_id: number
  imovel_titulo: string | null
  cliente_nome: string
  criado_em: string
  tamanho_bytes: number
}

// ===========================================================================
// Admin
// ===========================================================================
export interface AdminStats {
  total_users: number
  total_consultores: number
  total_clientes: number
  total_canonicos: number
  total_versoes: number
  total_pdfs: number
  total_historico: number
  ingest_ultimos_7_dias: number
  pdfs_ultimos_7_dias: number
}

export interface AdminConsultor {
  id: number
  user_id: number
  nome: string
  email: string
  is_admin: boolean
  ativo: boolean
  telefone: string | null
  criado_em: string
  num_imoveis: number
  num_clientes: number
  num_pdfs: number
}

export interface AdminCanonico {
  id: number
  property_id: string
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  url: string | null
  criado_em: string
  extraido_em: string
  num_fotos: number
  num_versoes: number
}

export interface AdminVersao {
  id: number
  imovel_canonico_id: number
  property_id: string
  titulo: string | null
  preco: string | null
  consultor_id: number
  consultor_nome: string
  consultor_email: string
  tem_conflitos: boolean
  criado_em: string
  atualizado_em: string
}

export interface AdminHistorico {
  id: number
  imovel_canonico_id: number
  property_id: string
  imovel_titulo: string | null
  capturado_em: string
}

export interface AdminPdf {
  id: number
  imovel_versao_id: number
  imovel_titulo: string | null
  property_id: string
  cliente_nome: string
  consultor_id: number
  consultor_nome: string
  tamanho_bytes: number
  criado_em: string
}


// ===========================================================================
// Links de cliente
// ===========================================================================
export interface Link {
  id: number
  cliente_id: number
  consultor_id: number
  token_prefix: string
  token_visible: string | null
  url_publica: string | null
  ativo: boolean
  expira_em: string
  revogado_em: string | null
  ultimo_acesso_em: string | null
  criado_em: string
  atualizado_em: string
  cliente_nome: string
  num_imoveis: number
  num_acessos: number
}

export interface LinkImovel {
  imovel_versao_id: number
  ordem: number
  titulo: string | null
  preco: string | null
  localizacao: string[] | null
  num_fotos: number
  criado_em: string
}

export interface LinkComDetalhes extends Link {
  imoveis: LinkImovel[]
}

export interface LinkAcesso {
  id: number
  imovel_versao_id: number | null
  imovel_titulo: string | null
  user_agent: string | null
  referrer: string | null
  criado_em: string
}

export interface ImovelAnalytics {
  imovel_versao_id: number
  imovel_titulo: string | null
  num_acessos: number
  ultimo_acesso_em: string | null
}

export interface LinkAnalytics {
  link_id: number
  num_acessos_total: number
  num_acessos_lista: number
  num_acessos_detalhe: number
  ultimo_acesso_em: string | null
  por_imovel: ImovelAnalytics[]
  acessos_recentes: LinkAcesso[]
}