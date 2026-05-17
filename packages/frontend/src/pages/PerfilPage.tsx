import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Shield, CreditCard, LogOut, CheckCircle, Loader2,
  Upload, Eye, EyeOff, Lock, ArrowLeft,
} from 'lucide-react'
import api from '../lib/api.ts'
import axios from 'axios'
import { useAuthStore } from '../store/auth.ts'

type Tab = 'perfil' | 'seguridad' | 'pagos' | 'sesion'

const FACULTADES = [
  'Ingeniería de Sistemas', 'Administración de Empresas', 'Contaduría Pública',
  'Derecho', 'Enfermería', 'Medicina', 'Licenciatura en Matemáticas', 'Otra',
]

const BANCOS_CO = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia', 'Banco Popular',
  'Banco Agrario', 'Banco Caja Social', 'Banco de Occidente', 'Banco GNB Sudameris',
  'Citibank Colombia', 'Helm Bank', 'Banco Falabella', 'Nequi', 'Daviplata', 'Otro',
]

// ── Sección: Información de perfil ───────────────────────────────────────────

function TabPerfil() {
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
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al guardar' : 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      const res = await api.post('/api/uploads/perfil/foto', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (token && usuario) setAuth(token, { ...usuario, foto_url: res.data.url })
    } catch {
      setError('Subida de foto no disponible aún')
    } finally { setUploading(false); if (e.target) e.target.value = '' }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Información personal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Así te verán otros usuarios en el marketplace</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {usuario?.foto_url
            ? <img src={usuario.foto_url} alt={usuario.nombre} className="w-20 h-20 rounded-full object-cover ring-2 ring-green-100" />
            : <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center ring-2 ring-green-200">
                <User size={32} className="text-green-600" />
              </div>}
          <label className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1.5 cursor-pointer hover:bg-gray-50 shadow-sm">
            {uploading ? <Loader2 size={14} className="animate-spin text-gray-500" /> : <Upload size={14} className="text-gray-500" />}
            <input type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </label>
        </div>
        <div>
          <p className="font-semibold text-gray-800">{usuario?.nombre}</p>
          <p className="text-sm text-gray-500">{usuario?.email}</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize mt-1 inline-block">
            {usuario?.rol}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input value={form.nombre} onChange={e => f('nombre', e.target.value)} className="input" required minLength={2} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => f('bio', e.target.value)}
            className="input resize-none"
            rows={3}
            placeholder="Cuéntanos un poco sobre ti..."
            maxLength={500}
          />
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

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

// ── Sección: Seguridad ────────────────────────────────────────────────────────

function TabSeguridad() {
  const [form, setForm] = useState({ password_actual: '', password_nuevo: '', confirmar: '' })
  const [show, setShow] = useState({ actual: false, nuevo: false, confirmar: false })
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setOk(false)
    if (form.password_nuevo !== form.confirmar) {
      setError('Las contraseñas nuevas no coinciden'); return
    }
    setLoading(true)
    try {
      await api.put('/api/users/me/password', {
        password_actual: form.password_actual,
        password_nuevo: form.password_nuevo,
      })
      setOk(true)
      setForm({ password_actual: '', password_nuevo: '', confirmar: '' })
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al cambiar contraseña' : 'Error')
    } finally { setLoading(false) }
  }

  const toggle = (k: keyof typeof show) => setShow(p => ({ ...p, [k]: !p[k] }))

  const requisitos = [
    { label: 'Mínimo 16 caracteres', ok: form.password_nuevo.length >= 16 },
    { label: 'Una letra mayúscula', ok: /[A-Z]/.test(form.password_nuevo) },
    { label: 'Una letra minúscula', ok: /[a-z]/.test(form.password_nuevo) },
    { label: 'Un número', ok: /[0-9]/.test(form.password_nuevo) },
    { label: 'Un símbolo (!@#$...)', ok: /[^A-Za-z0-9]/.test(form.password_nuevo) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Seguridad de la cuenta</h2>
        <p className="text-sm text-gray-500 mt-0.5">Cambia tu contraseña regularmente para mantener tu cuenta segura</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Lock size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">Tu contraseña se almacena cifrada con bcrypt. Nunca la compartimos ni la veremos en texto plano.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: 'password_actual', label: 'Contraseña actual', showKey: 'actual' as const },
          { key: 'password_nuevo', label: 'Nueva contraseña', showKey: 'nuevo' as const },
          { key: 'confirmar', label: 'Confirmar nueva contraseña', showKey: 'confirmar' as const },
        ].map(({ key, label, showKey }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
              <input
                type={show[showKey] ? 'text' : 'password'}
                value={form[key as keyof typeof form]}
                onChange={f(key as keyof typeof form)}
                className="input pr-10"
                required
              />
              <button type="button" onClick={() => toggle(showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        {form.password_nuevo.length > 0 && (
          <ul className="space-y-1">
            {requisitos.map(r => (
              <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle size={12} className={r.ok ? 'opacity-100' : 'opacity-30'} />
                {r.label}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {ok && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} /> Contraseña actualizada</p>}

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Cambiando...</> : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}

// ── Sección: Cuenta de pagos ──────────────────────────────────────────────────

function TabPagos() {
  const [form, setForm] = useState({
    banco_nombre: '', tipo_cuenta: 'AHORROS', numero: '',
    tipo_doc: 'CC', numero_doc: '', titular: '', email: '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/pagos/mi-cuenta-bancaria')
      .then(r => { if (r.data.data) setForm({ ...r.data.data }) })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setOk(false)
    try {
      await api.put('/api/pagos/mi-cuenta-bancaria', form)
      setOk(true)
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al guardar' : 'Error')
    } finally { setLoading(false) }
  }

  if (fetching) return <div className="py-10 text-center"><Loader2 size={24} className="animate-spin text-gray-400 mx-auto" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Cuenta bancaria para pagos</h2>
        <p className="text-sm text-gray-500 mt-0.5">Aquí recibirás el 85% del valor de tus ventas, descontada la comisión de plataforma</p>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
        <Shield size={16} className="text-green-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-800 space-y-0.5">
          <p className="font-medium">Tus datos están protegidos</p>
          <p className="text-green-700 text-xs">Transmitidos por HTTPS · Almacenados cifrados · Solo usados para liquidaciones · Nunca compartidos sin tu autorización</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banco *</label>
            <select value={form.banco_nombre} onChange={set('banco_nombre')} className="input" required>
              <option value="">Selecciona banco</option>
              {BANCOS_CO.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta *</label>
            <select value={form.tipo_cuenta} onChange={set('tipo_cuenta')} className="input" required>
              <option value="AHORROS">Ahorros</option>
              <option value="CORRIENTE">Corriente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número de cuenta *</label>
          <input value={form.numero} onChange={set('numero')} className="input" required
            placeholder="Ej: 12345678901" pattern="[0-9]+" title="Solo números" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
            <select value={form.tipo_doc} onChange={set('tipo_doc')} className="input" required>
              <option value="CC">Cédula (CC)</option>
              <option value="NIT">NIT</option>
              <option value="CE">Cédula Extranjera</option>
              <option value="PPN">Pasaporte</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento *</label>
            <input value={form.numero_doc} onChange={set('numero_doc')} className="input" required
              placeholder="Ej: 1000123456" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titular de la cuenta *</label>
          <input value={form.titular} onChange={set('titular')} className="input" required
            placeholder="Nombre completo como aparece en el banco" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email para notificaciones de pago *</label>
          <input type="email" value={form.email} onChange={set('email')} className="input" required
            placeholder="tu@correo.com" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {ok && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} /> Cuenta guardada correctamente</p>}

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar cuenta bancaria'}
        </button>
      </form>
    </div>
  )
}

// ── Sección: Sesión ───────────────────────────────────────────────────────────

function TabSesion() {
  const { logout, usuario } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Sesión y cuenta</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona el acceso a tu cuenta</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Sesión activa</p>
            <p className="text-xs text-gray-500 mt-0.5">{usuario?.email}</p>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Activa</span>
        </div>
        <div className="p-4">
          <p className="text-sm font-medium text-gray-800 mb-1">Cerrar sesión</p>
          <p className="text-xs text-gray-500 mb-3">Se cerrará tu sesión en este dispositivo. Tus datos permanecen seguros.</p>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-1">¿Necesitas ayuda?</p>
        <p className="text-xs text-gray-500 mb-3">Si tienes problemas con tu cuenta, contáctanos.</p>
        <a href="mailto:marketplace@uniguajira.edu.co"
          className="text-sm text-green-700 font-medium hover:underline">
          marketplace@uniguajira.edu.co
        </a>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { usuario } = useAuthStore()
  const [tab, setTab] = useState<Tab>('perfil')
  const esVendedor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin'

  const TABS: { key: Tab; label: string; icon: React.ElementType; vendorOnly?: boolean }[] = [
    { key: 'perfil',    label: 'Mi perfil',       icon: User    },
    { key: 'seguridad', label: 'Seguridad',        icon: Shield  },
    { key: 'pagos',     label: 'Cuenta de pagos',  icon: CreditCard, vendorOnly: true },
    { key: 'sesion',    label: 'Sesión',            icon: LogOut  },
  ].filter(t => !t.vendorOnly || esVendedor)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={15} /> Dashboard
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-6">Mi cuenta</h1>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Sidebar nav */}
        <aside className="w-full sm:w-52 flex-shrink-0">
          {/* Mobile: tab bar horizontal */}
          <div className="flex sm:hidden gap-1 overflow-x-auto scrollbar-hide bg-white border border-gray-200 rounded-xl p-1 mb-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  tab === key ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* Desktop: sidebar vertical */}
          <nav className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left border-l-2 ${
                  tab === key
                    ? 'bg-green-50 text-green-700 border-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-transparent'
                }`}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Contenido */}
        <main className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          {tab === 'perfil'    && <TabPerfil />}
          {tab === 'seguridad' && <TabSeguridad />}
          {tab === 'pagos'     && <TabPagos />}
          {tab === 'sesion'    && <TabSesion />}
        </main>
      </div>
    </div>
  )
}
