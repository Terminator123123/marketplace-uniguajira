import { useEffect, useState, useRef } from 'react'
import { Package, ShoppingBag, Star, TrendingUp, Plus, Pencil, Store, Loader2, X, Upload, Trash2, Send, CheckCircle, Clock } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../store/auth.ts'
import type { Orden, Producto } from '@marketplace/shared'

interface Tienda {
  id_tienda: string
  nombre_tienda: string
  descripcion?: string
  estado: string
  _count?: { productos: number }
}

interface Solicitud {
  id_solicitud: string
  rol_solicitado: string
  motivacion?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  created_at: string
}

type Tab = 'resumen' | 'productos' | 'tienda' | 'admin'

export default function DashboardPage() {
  const { usuario, token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const esVendedor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin'
  const esAdmin = usuario?.rol === 'admin'
  const esComprador = usuario?.rol === 'comprador'

  const [tab, setTab] = useState<Tab>('resumen')
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFormProducto, setShowFormProducto] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState<Producto | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordRes] = await Promise.all([
          axios.get('/api/ordenes/mis-ordenes', { headers }),
        ])
        setOrdenes(ordRes.data.data)

        if (esVendedor) {
          const [tiendaRes, prodRes] = await Promise.all([
            axios.get('/api/tiendas/mi-tienda', { headers }),
            axios.get('/api/tiendas/mi-tienda/productos', { headers }),
          ])
          setTienda(tiendaRes.data.data)
          setProductos(prodRes.data.data)
        }

        if (esComprador) {
          const solRes = await axios.get('/api/solicitudes/mi-solicitud', { headers })
          setSolicitud(solRes.data.data)
        }
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const totalVentas = ordenes.filter(o => o.estado === 'completada').reduce((s, o) => s + Number(o.total), 0)
  const pendientes = ordenes.filter(o => o.estado === 'pendiente').length

  const TABS: [Tab, string][] = [
    ['resumen', 'Resumen'],
    ...(esVendedor ? [['productos', 'Mis Productos'], ['tienda', 'Mi Tienda']] as [Tab, string][] : []),
    ...(esAdmin ? [['admin', 'Admin']] as [Tab, string][] : []),
  ]

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-8"><div className="h-32 bg-gray-100 rounded-xl animate-pulse" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">Bienvenido, {usuario?.nombre}</p>

      {/* Banner solicitud de rol para compradores */}
      {esComprador && (
        <BannerSolicitudRol token={token!} solicitud={solicitud} onSolicitud={setSolicitud} />
      )}

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab Resumen ── */}
      {tab === 'resumen' && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: TrendingUp, label: 'Ventas totales', value: `$${totalVentas.toLocaleString('es-CO')}`, color: 'text-green-600' },
              { icon: ShoppingBag, label: 'Órdenes totales', value: ordenes.length, color: 'text-blue-600' },
              { icon: Package, label: 'Pendientes', value: pendientes, color: 'text-orange-600' },
              { icon: Star, label: 'Rating', value: Number(usuario?.rating_promedio ?? 0).toFixed(1), color: 'text-yellow-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card">
                <Icon size={24} className={`${color} mb-2`} />
                <p className="text-gray-500 text-sm">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Órdenes recientes</h2>
            {ordenes.length === 0 ? <p className="text-gray-400 text-center py-8">Sin órdenes aún</p> : (
              <div className="space-y-3">
                {ordenes.slice(0, 10).map(o => (
                  <div key={o.id_orden} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{o.id_orden.slice(0, 8)}...</p>
                      <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">${Number(o.total).toLocaleString('es-CO')}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        o.estado === 'completada' ? 'bg-green-100 text-green-700' :
                        o.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                      }`}>{o.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab Productos ── */}
      {tab === 'productos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Mis productos ({productos.length})</h2>
            <button onClick={() => { setEditandoProducto(null); setShowFormProducto(true) }} className="btn-primary flex items-center gap-1 text-sm">
              <Plus size={16} /> Agregar producto
            </button>
          </div>
          {productos.length === 0 ? (
            <div className="card text-center py-12">
              <Package size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">Aún no tienes productos publicados</p>
              <button onClick={() => { setEditandoProducto(null); setShowFormProducto(true) }} className="btn-primary">Publicar mi primer producto</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productos.map(p => (
                <div key={p.id_producto} className="card flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {p.imagenes?.[0] ? <img src={p.imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm line-clamp-1">{p.nombre}</p>
                    <p className="text-green-700 font-semibold text-sm">${Number(p.precio).toLocaleString('es-CO')}</p>
                    <p className="text-xs text-gray-400">{p.categoria} · {p.tipo === 'fisico' ? `Stock: ${p.stock ?? '—'}` : 'Servicio'}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <button onClick={() => { setEditandoProducto(p); setShowFormProducto(true) }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <Pencil size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showFormProducto && (
            <FormProducto token={token!} tiendaId={tienda?.id_tienda ?? ''} producto={editandoProducto}
              onClose={() => setShowFormProducto(false)}
              onSaved={(p) => {
                if (editandoProducto) setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? p : x))
                else setProductos(prev => [p, ...prev])
                setShowFormProducto(false)
              }} />
          )}
        </div>
      )}

      {/* ── Tab Tienda ── */}
      {tab === 'tienda' && <FormTienda token={token!} tienda={tienda} onSaved={setTienda} />}

      {/* ── Tab Admin ── */}
      {tab === 'admin' && <AdminPanel token={token!} />}
    </div>
  )
}

// ── Banner Solicitud de Rol ─────────────────────────────────────────────────

function BannerSolicitudRol({ token, solicitud, onSolicitud }: {
  token: string
  solicitud: Solicitud | null
  onSolicitud: (s: Solicitud) => void
}) {
  const headers = { Authorization: `Bearer ${token}` }
  const [motivacion, setMotivacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  if (solicitud?.estado === 'aprobada') return null

  async function enviar() {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/solicitudes', { rol_solicitado: 'vendedor', motivacion }, { headers })
      onSolicitud(res.data.data)
      setShow(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al enviar')
    } finally { setLoading(false) }
  }

  if (solicitud?.estado === 'pendiente') {
    return (
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
        <Clock size={18} className="text-yellow-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-yellow-800">Solicitud de vendedor en revisión</p>
          <p className="text-xs text-yellow-600">Te avisaremos cuando el equipo la apruebe.</p>
        </div>
      </div>
    )
  }

  if (solicitud?.estado === 'rechazada') {
    return (
      <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-red-800">Tu solicitud fue rechazada.</p>
        <p className="text-xs text-red-600">Puedes volver a intentarlo con más información.</p>
        <button onClick={() => setShow(true)} className="mt-2 text-xs text-red-700 underline">Enviar nueva solicitud</button>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-green-800">¿Quieres vender en el Marketplace?</p>
          <p className="text-sm text-green-700 mt-0.5">Solicita convertirte en vendedor y crea tu tienda.</p>
        </div>
        {!show && (
          <button onClick={() => setShow(true)} className="btn-primary flex items-center gap-1 text-sm whitespace-nowrap">
            <Send size={14} /> Solicitar
          </button>
        )}
      </div>
      {show && (
        <div className="mt-4 space-y-3">
          <textarea
            value={motivacion}
            onChange={e => setMotivacion(e.target.value)}
            placeholder="Cuéntanos brevemente qué quieres vender (opcional)..."
            className="input resize-none text-sm"
            rows={3}
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShow(false)} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={enviar} disabled={loading} className="flex-1 btn-primary text-sm flex items-center justify-center gap-1">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar solicitud
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Formulario de Producto ──────────────────────────────────────────────────

const CATEGORIAS = ['artesanías', 'papelería', 'tecnología', 'alimentos', 'tutorías', 'soporte técnico', 'diseño gráfico']

function FormProducto({ token, producto, onClose, onSaved }: {
  token: string
  tiendaId: string
  producto: Producto | null
  onClose: () => void
  onSaved: (p: Producto) => void
}) {
  const headers = { Authorization: `Bearer ${token}` }
  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ? String(producto.precio) : '',
    tipo: (producto?.tipo ?? 'fisico') as 'fisico' | 'servicio',
    categoria: producto?.categoria ?? CATEGORIAS[0],
    stock: producto?.stock ? String(producto.stock) : '',
  })
  const [imagenes, setImagenes] = useState(producto?.imagenes ?? [])
  const [savedId, setSavedId] = useState(producto?.id_producto ?? '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const field = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const body = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        precio: Number(form.precio),
        tipo: form.tipo,
        categoria: form.categoria,
        stock: form.tipo === 'fisico' && form.stock ? Number(form.stock) : undefined,
      }
      const res = savedId
        ? await axios.put(`/api/productos/${savedId}`, body, { headers })
        : await axios.post('/api/productos', body, { headers })
      setSavedId(res.data.data.id_producto)
      onSaved({ ...res.data.data, imagenes })
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !savedId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      const res = await axios.post(`/api/uploads/producto/${savedId}/imagenes`, fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      })
      setImagenes(prev => [...prev, res.data.data])
    } catch { setError('Error al subir imagen') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleDeleteImg(id: string) {
    try {
      await axios.delete(`/api/uploads/imagenes/${id}`, { headers })
      setImagenes(prev => prev.filter(i => i.id_imagen !== id))
    } catch { setError('Error al eliminar imagen') }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => field('nombre', e.target.value)} className="input" required minLength={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={form.descripcion} onChange={e => field('descripcion', e.target.value)} className="input resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio (COP) *</label>
              <input type="number" min="0" value={form.precio} onChange={e => field('precio', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={form.tipo} onChange={e => field('tipo', e.target.value)} className="input">
                <option value="fisico">Físico</option>
                <option value="servicio">Servicio</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select value={form.categoria} onChange={e => field('categoria', e.target.value)} className="input">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {form.tipo === 'fisico' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                <input type="number" min="0" value={form.stock} onChange={e => field('stock', e.target.value)} className="input" placeholder="0" />
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (savedId ? 'Guardar cambios' : 'Publicar producto')}
            </button>
          </div>
        </form>

        {/* Imágenes — solo después de guardar el producto */}
        {savedId && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Imágenes del producto</p>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800 font-medium">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Subiendo...' : 'Subir imagen'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
            {imagenes.length === 0 ? (
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center cursor-pointer hover:border-green-400 transition-colors">
                <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Clic para subir foto del producto</p>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {imagenes.map(img => (
                  <div key={img.id_imagen} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.es_principal && <span className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[10px] text-center">Principal</span>}
                    <button onClick={() => handleDeleteImg(img.id_imagen)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors">
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Formulario de Tienda ────────────────────────────────────────────────────

function FormTienda({ token, tienda, onSaved }: { token: string; tienda: Tienda | null; onSaved: (t: Tienda) => void }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [form, setForm] = useState({ nombre_tienda: tienda?.nombre_tienda ?? '', descripcion: tienda?.descripcion ?? '' })
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setOk(false)
    try {
      const res = tienda
        ? await axios.put('/api/tiendas/mi-tienda', form, { headers })
        : await axios.post('/api/tiendas', form, { headers })
      onSaved(res.data.data); setOk(true)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <div className="card max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Store size={20} className="text-green-700" />
        <h2 className="font-semibold text-gray-800">{tienda ? 'Editar mi tienda' : 'Crear mi tienda'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la tienda *</label>
          <input value={form.nombre_tienda} onChange={e => setForm(f => ({ ...f, nombre_tienda: e.target.value }))}
            className="input" required minLength={2} placeholder="Ej: Artesanías Wayuu de María" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            className="input resize-none" rows={4} placeholder="Cuéntale a tus compradores qué vendes..." />
        </div>
        {tienda && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
            Estado: <span className={`font-medium ${tienda.estado === 'activa' ? 'text-green-700' : 'text-yellow-600'}`}>{tienda.estado}</span>
            {tienda._count && <> · <span className="font-medium">{tienda._count.productos}</span> productos activos</>}
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {ok && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} /> Tienda guardada correctamente</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (tienda ? 'Guardar cambios' : 'Crear tienda')}
        </button>
      </form>
    </div>
  )
}

// ── Panel Admin ─────────────────────────────────────────────────────────────

interface SolicitudAdmin {
  id_solicitud: string
  rol_solicitado: string
  motivacion?: string
  estado: string
  created_at: string
  usuario: { nombre: string; email: string; facultad?: string }
}

function AdminPanel({ token }: { token: string }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [solicitudes, setSolicitudes] = useState<SolicitudAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/solicitudes', { headers }).then(r => setSolicitudes(r.data.data)).finally(() => setLoading(false))
  }, [])

  async function decidir(id: string, decision: 'aprobada' | 'rechazada') {
    setProcesando(id)
    try {
      await axios.patch(`/api/solicitudes/${id}`, { decision }, { headers })
      setSolicitudes(prev => prev.filter(s => s.id_solicitud !== id))
    } catch { /* silencioso */ }
    finally { setProcesando(null) }
  }

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Solicitudes de rol pendientes</h2>
      {loading ? <div className="h-20 bg-gray-100 rounded-xl animate-pulse" /> :
        solicitudes.length === 0 ? (
          <div className="card text-center py-10">
            <CheckCircle size={36} className="mx-auto text-green-400 mb-2" />
            <p className="text-gray-500">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map(s => (
              <div key={s.id_solicitud} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800">{s.usuario.nombre}</p>
                    <p className="text-sm text-gray-500">{s.usuario.email} · {s.usuario.facultad ?? 'Sin facultad'}</p>
                    <p className="text-xs text-gray-400 mt-1">Solicita ser: <span className="font-medium text-green-700">{s.rol_solicitado}</span></p>
                    {s.motivacion && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">"{s.motivacion}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decidir(s.id_solicitud, 'rechazada')} disabled={procesando === s.id_solicitud}
                      className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors">
                      Rechazar
                    </button>
                    <button onClick={() => decidir(s.id_solicitud, 'aprobada')} disabled={procesando === s.id_solicitud}
                      className="px-3 py-1.5 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition-colors flex items-center gap-1">
                      {procesando === s.id_solicitud ? <Loader2 size={14} className="animate-spin" /> : null}
                      Aprobar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
