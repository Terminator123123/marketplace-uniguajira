import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api.ts'
import axios from 'axios'

type Stage = 'request' | 'sent' | 'reset' | 'done' | 'error'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [stage, setStage] = useState<Stage>(token ? 'reset' : 'request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setStage('sent')
    } catch {
      setMsg('Ocurrió un error. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setMsg('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setMsg('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setStage('done')
    } catch (err: unknown) {
      const errMsg = axios.isAxiosError(err) ? err.response?.data?.error : 'Enlace inválido o expirado.'
      setStage('error')
      setMsg(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-md">

        {stage === 'request' && (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Recuperar contraseña</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="tu@uniguajira.edu.co"
                  required
                />
              </div>
              {msg && <p className="text-red-500 text-sm">{msg}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-600 mt-4">
              <Link to="/login" className="text-green-700 hover:underline">Volver al login</Link>
            </p>
          </>
        )}

        {stage === 'sent' && (
          <div className="text-center space-y-3 py-4">
            <div className="text-5xl">📧</div>
            <h2 className="text-xl font-semibold text-gray-800">Revisa tu correo</h2>
            <p className="text-sm text-gray-500">
              Si tu correo está registrado, recibirás un enlace en los próximos minutos. El enlace expira en 30 minutos.
            </p>
            <Link to="/login" className="text-green-700 text-sm hover:underline">Volver al login</Link>
          </div>
        )}

        {stage === 'reset' && (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Nueva contraseña</h1>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="input"
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
              {msg && <p className="text-red-500 text-sm">{msg}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <div className="text-center space-y-3 py-4">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-semibold text-gray-800">¡Contraseña actualizada!</h2>
            <p className="text-sm text-gray-500">Ya puedes ingresar con tu nueva contraseña.</p>
            <Link to="/login" className="btn-primary inline-block mt-2">Ir al login</Link>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center space-y-3 py-4">
            <div className="text-5xl">❌</div>
            <h2 className="text-xl font-semibold text-gray-800">Enlace inválido</h2>
            <p className="text-sm text-gray-500">{msg || 'El enlace no es válido o ya expiró.'}</p>
            <Link to="/reset-password" className="text-green-700 text-sm hover:underline">Solicitar nuevo enlace</Link>
          </div>
        )}

      </div>
    </div>
  )
}
