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
  estado_imovel: EstadoImovel
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
  estado_imovel: EstadoImovel
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
  // Papéis: pelo menos um é true (validado no backend)
  e_comprador: boolean
  e_vendedor: boolean
  criado_em: string
  atualizado_em: string
  // Ficha de qualificação (só existe quando e_comprador=true e já preenchida)
  qualificacao: QualificacaoComprador | null
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
// Ficha de qualificação de comprador
// ===========================================================================

export type UrgenciaComprador = 'baixa' | 'media' | 'alta'

export type EstadoDesejadoImovel =
  | 'novo'
  | 'semi_novo'
  | 'remodelado'
  | 'obras'
  | 'indiferente'

export type EstadoQualificacao =
  | 'nao_iniciada'
  | 'em_preenchimento'
  | 'concluida'

export interface QualificacaoComprador {
  id: number
  cliente_id: number
  consultor_id: number
  estado: EstadoQualificacao

  // Bloco 1 — Disponibilidade
  compra_sozinho: boolean | null
  disp_notas: string | null
  disp_alternativas: string | null

  // Bloco 2 — Perfil / Motivação
  motivo_compra: string | null
  tempo_procura: string | null
  urgencia: UrgenciaComprador | null
  quando_resolver: string | null
  tem_imovel_venda: boolean | null
  precisa_vender_comprar: boolean | null

  // Bloco 3 — Imóvel pretendido
  caracteristicas: string | null
  nao_prescinde: string | null
  valor_maximo: string | null // Decimal serializado como string
  zonas_pretendidas: string | null
  motivo_zonas: string | null
  quartos: number | null
  tipologia: string | null
  estado_desejado: EstadoDesejadoImovel | null
  preferencia_andar: string | null
  elevador: boolean | null
  parqueamento: string | null
  arrecadacao: boolean | null
  exteriores: string | null
  acessos: string | null
  transportes: string | null
  comercio_jardins: string | null
  areas_especificas: string | null
  notas_extra: string | null

  // Bloco 4 — Financeira
  compra_pp: boolean | null
  financiamento_100: boolean | null
  falou_banco: boolean | null
  banco: string | null
  capitais_proprios: boolean | null
  capitais_proprios_valor: string | null // Decimal como string
  efetivo: boolean | null
  fiadores: boolean | null
  reuniao_loja: boolean | null

  criado_em: string
  atualizado_em: string
}

/** Payload do PUT — sem os campos gerados pelo backend. */
export type QualificacaoCompradorUpsert = Omit<
  QualificacaoComprador,
  'id' | 'cliente_id' | 'consultor_id' | 'criado_em' | 'atualizado_em'
>

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
  estado_imovel: EstadoImovel
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

// ===========================================================================
// Estado do imóvel / Interações / Notas
// ===========================================================================

export type EstadoImovel =
  | 'disponivel'
  | 'reservado'
  | 'cpcv'
  | 'escritura_marcada'
  | 'vendido'
  | 'saiu_mercado'

export type TipoInteracao = 'interesse' | 'pedido_visita' | 'pedido_info'
export type EstadoInteracao = 'pendente' | 'visto' | 'concluido' | 'cancelado'
export type AutorTipo = 'cliente' | 'consultor'

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

export interface InteracaoComContexto extends Interacao {
  cliente_nome: string
  imovel_titulo: string | null
  imovel_estado: EstadoImovel | null
}

export interface Nota {
  id: number
  cliente_id: number
  imovel_versao_id: number | null
  autor_tipo: AutorTipo
  autor_user_id: number | null
  conteudo: string
  lida_pelo_destinatario: boolean
  criado_em: string
}

export interface NotaComContexto extends Nota {
  autor_nome: string | null
  imovel_titulo: string | null
  cliente_nome: string | null
}

export interface DashboardInteracoesPendentes {
  interesses_nao_vistos: number
  pedidos_pendentes: number
  pedidos_info_pendentes: number
  notas_nao_lidas: number
  recentes: InteracaoComContexto[]
}


export interface ConsultorAdminCreate {
  email: string
  password: string
  nome: string
  telefone?: string | null
  nif?: string | null
  bio?: string | null
  agencia?: string | null
  is_admin?: boolean
}

export interface ConsultorAdminCredenciaisUpdate {
  email?: string
  new_password?: string
}