import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import api from '../lib/api.ts'

type Estado = 'cargando' | 'ok' | 'error' | 'sin-token'

export default function VerificarEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [estado, setEstado] = useState<Estado>(token ? 'cargando' : 'sin-token')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (!token) return
    api.get(`/api/auth/verify-email?token=${token}`)
      .then(r => { setMensaje(r.data.message); setEstado('ok') })
      .catch(e => { setMensaje(e.response?.data?.error ?? 'El enlace no es válido o ya expiró'); setEstado('error') })
  }, [token])

  if (estado === 'cargando') return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={40} className="mx-auto text-green-600 animate-spin mb-4" />
        <p className="text-gray-600">Verificando tu correo...</p>
      </div>
    </div>
  )

  if (estado === 'ok') return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-green-100 rounded-full">
            <CheckCircle size={40} className="text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Correo verificado!</h1>
        <p className="text-gray-600 mb-6">{mensaje || 'Tu cuenta está activa. Ya puedes iniciar sesión.'}</p>
        <Link to="/login" className="btn-primary inline-block">Iniciar sesión</Link>
      </div>
    </div>
  )

  if (estado === 'error') return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-100 rounded-full">
            <XCircle size={40} className="text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Enlace inválido</h1>
        <p className="text-gray-600 mb-6">{mensaje}</p>
        <Link to="/login" className="btn-primary inline-block">Volver al login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Mail size={40} className="text-blue-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Verifica tu correo</h1>
        <p className="text-gray-600">Revisa tu bandeja de entrada y haz clic en el enlace de verificación que te enviamos.</p>
      </div>
    </div>
  )
}
