import axios from 'axios'

// Em dev, o proxy Vite aponta para localhost:8000.
// Em prod, o Cloudflare Tunnel aponta para crm.chanilaicastro.pt/api.
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export default api