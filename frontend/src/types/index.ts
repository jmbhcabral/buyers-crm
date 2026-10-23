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