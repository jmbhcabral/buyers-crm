import axios from 'axios'

const api = axios.create({
  baseURL: '/api',   // o proxy do Vite encaminha para localhost:8000
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para injetar o token JWT em cada pedido
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para lidar com 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      // Não redireciona aqui — deixa o React Router lidar
    }
    return Promise.reject(error)
  }
)

export default api