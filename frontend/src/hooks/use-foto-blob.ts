import { useEffect, useState } from 'react'
import api from '@/lib/api'

export function useFotoBlob(versaoId: number, fotoId: number) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null

    api
      .get(`/imoveis/${versaoId}/fotos/${fotoId}`, { responseType: 'blob' })
      .then((resp) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(resp.data)
        setUrl(objectUrl)
      })
      .catch(() => setUrl(null))

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [versaoId, fotoId])

  return url
}