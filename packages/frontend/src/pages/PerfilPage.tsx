import { useState } from 'react'
import { ArrowLeft, CheckCircle, Loader2, User, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api.ts'
import { useAuthStore } from '../store/auth.ts'

const FACULTADES = [
  'Ingeniería de Sistemas', 'Administración de Empresas', 'Contaduría Pública',
  'Derecho', 'Enfermería', 'Medicina', 'Licenciatura en Matemáticas', 'Otra',
]

export default function PerfilPage() {
  const { usuario, setAuth, token } = useAuthStore()
  const [form, setForm] = useState({
    nombre: usuario?.nombre ?? '',
    bio: usuario?.bio ?? '',
    facultad: usuario?.facultad ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setOk(false)
    try {
      const res = await api.put('/api/users/me', form)
      if (token && usuario) setAuth(token, { ...usuario, ...res.data.data })
      setOk(true)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      // Subimos como imagen de perfil — endpoint genérico de uploads no disponible aún,
      // usamos Cloudinary directamente via el endpoint de producto temporalmente.
      // TODO: agregar endpoint /api/users/me/foto
      setError('Subida de foto próximamente disponible')
    } catch { setError('Error al subir foto') }
    finally { setUploading(false); if (e.target) e.target.value = '' }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mi perfil</h1>

      <div className="card">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {usuario?.foto_url
              ? <img src={usuario.foto_url} alt={usuario.nombre} className="w-20 h-20 rounded-full object-cover" />
              : <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <User size={32} className="text-green-600" />
                </div>}
            <label className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 cursor-pointer hover:bg-gray-50 shadow-sm">
              {uploading ? <Loader2 size={14} className="animate-spin text-gray-500" /> : <Upload size={14} className="text-gray-500" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            </label>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{usuario?.nombre}</p>
            <p className="text-sm text-gray-500">{usuario?.rol === 'comprador' ? 'Comprador' : usuario?.rol}</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize mt-1 inline-block">{usuario?.rol}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input value={form.nombre} onChange={e => f('nombre', e.target.value)} className="input" required minLength={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={form.bio} onChange={e => f('bio', e.target.value)} className="input resize-none" rows={3} placeholder="Cuéntanos un poco sobre ti..." maxLength={500} />
            <p className="text-xs text-gray-400 mt-1">{form.bio.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facultad</label>
            <select value={form.facultad} onChange={e => f('facultad', e.target.value)} className="input">
              <option value="">Sin especificar</option>
              {FACULTADES.map(fac => <option key={fac} value={fac}>{fac}</option>)}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {ok && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} /> Perfil actualizado</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
