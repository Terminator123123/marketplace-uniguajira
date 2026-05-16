import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Package, ShoppingBag, Star, TrendingUp, Plus, Pencil, Store,
  Loader2, X, Upload, Trash2, Send, CheckCircle, Clock, ExternalLink,
  LayoutDashboard, Settings, Shield, Eye, ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import api from '../lib/api.ts'
import { getSocket } from '../lib/socket.ts'
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
  const esVendedor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin'
  const esAdmin = usuario?.rol === 'admin'
  const esComprador = usuario?.rol === 'comprador'

  const [tab, setTab] = useState<Tab>('resumen')
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [ventas, setVentas] = useState<Orden[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFormProducto, setShowFormProducto] = useState(false)
  const [editandoProducto, setEditandoProducto] = useState<Producto | null>(null)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas')

  const fetchOrdenes = useCallback(async () => {
    try {
      const [comprasRes, ventasRes] = await Promise.all([
        api.get('/api/ordenes/mis-ordenes'),
        esVendedor ? api.get('/api/ordenes/vendedor') : Promise.resolve(null),
      ])
      setOrdenes(comprasRes.data.data)
      if (ventasRes) setVentas(ventasRes.data.data)
    } catch { /* silencioso */ }
  }, [esVendedor])

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchOrdenes()
        if (esVendedor) {
          const [tiendaRes, prodRes] = await Promise.all([
            api.get('/api/tiendas/mi-tienda'),
            api.get('/api/tiendas/mi-tienda/productos'),
          ])
          setTienda(tiendaRes.data.data)
          setProductos(prodRes.data.data)
        }
        if (esComprador) {
          const solRes = await api.get('/api/solicitudes/mi-solicitud')
          setSolicitud(solRes.data.data)
        }
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    socket.on('nueva_orden', fetchOrdenes)
    socket.on('orden_actualizada', fetchOrdenes)
    return () => {
      socket.off('nueva_orden', fetchOrdenes)
      socket.off('orden_actualizada', fetchOrdenes)
    }
  }, [fetchOrdenes])

  async function handleToggleActivo(p: Producto) {
    const prev = productos
    setProductos(ps => ps.map(x => x.id_producto === p.id_producto ? { ...x, activo: !x.activo } : x))
    try {
      await api.put(`/api/productos/${p.id_producto}`, { activo: !p.activo })
    } catch {
      setProductos(prev)
    }
  }

  const ordenesResumen = esVendedor ? ventas : ordenes
  const totalVentas = ordenesResumen.filter(o => o.estado === 'completada').reduce((s, o) => s + Number(o.total), 0)
  const pendientes = ordenesResumen.filter(o => o.estado === 'pendiente').length

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )

  // ── Layout para compradores ──
  if (!esVendedor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
        <p className="text-gray-500 mb-6">Bienvenido, {usuario?.nombre}</p>

        {esComprador && (
          <BannerSolicitudRol token={token!} solicitud={solicitud} onSolicitud={setSolicitud} />
        )}

        <TabResumen ordenes={ordenes} totalVentas={0} pendientes={pendientes} esVendedor={false} />
      </div>
    )
  }

  // ── Layout para vendedores (y admin) ──
  const NAV: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { key: 'productos', label: 'Mis productos', icon: Package },
    { key: 'tienda', label: 'Mi tienda', icon: Store },
    ...(esAdmin ? [{ key: 'admin' as Tab, label: 'Admin', icon: Shield }] : []),
  ]

  const categorias = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))]
  const productosFiltrados = categoriaActiva === 'Todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center flex-shrink-0">
              <Store size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{tienda?.nombre_tienda ?? 'Mi tienda'}</p>
              {tienda && (
                <span className={`text-xs font-medium ${tienda.estado === 'activa' ? 'text-green-600' : 'text-yellow-600'}`}>
                  ● {tienda.estado}
                </span>
              )}
            </div>
          </div>
          {tienda && (
            <Link
              to={`/tienda/${tienda.id_tienda}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-700 font-medium transition-colors flex-shrink-0"
            >
              <Eye size={14} /> Ver tienda
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">

        {/* ── Sidebar ── */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
                  tab === key
                    ? 'bg-green-50 text-green-700 border-l-2 border-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-l-2 border-transparent'
                }`}
              >
                <Icon size={16} />
                {label}
                {tab === key && <ChevronRight size={14} className="ml-auto opacity-50" />}
              </button>
            ))}
          </nav>

          {/* Stats rápidas */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400">Ventas totales</p>
              <p className="text-lg font-bold text-gray-800">${totalVentas.toLocaleString('es-CO')}</p>
            </div>
            <div className="flex justify-between text-xs">
              <div>
                <p className="text-gray-400">Pendientes</p>
                <p className="font-semibold text-orange-600">{pendientes}</p>
              </div>
              <div>
                <p className="text-gray-400">Productos</p>
                <p className="font-semibold text-gray-700">{productos.length}</p>
              </div>
              <div>
                <p className="text-gray-400">Rating</p>
                <p className="font-semibold text-yellow-600">{Number(usuario?.rating_promedio ?? 0).toFixed(1)}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Contenido principal ── */}
        <main className="flex-1 min-w-0">

          {/* Nav mobile */}
          <div className="flex gap-1 mb-5 bg-white border border-gray-200 p-1 rounded-xl md:hidden overflow-x-auto scrollbar-hide">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === key ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* ── Tab Resumen ── */}
          {tab === 'resumen' && (
            <TabResumen ordenes={ventas} totalVentas={totalVentas} pendientes={pendientes} esVendedor />
          )}

          {/* ── Tab Productos ── */}
          {tab === 'productos' && (
            <div className="flex gap-4 items-start">

              {/* Categorías sidebar */}
              <div className="w-40 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden hidden sm:block">
                <div className="px-3 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categorías</p>
                </div>
                {categorias.map(cat => {
                  const count = cat === 'Todas' ? productos.length : productos.filter(p => p.categoria === cat).length
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoriaActiva(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left ${
                        categoriaActiva === cat
                          ? 'bg-green-50 text-green-700 font-semibold border-l-2 border-green-600'
                          : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className={`text-xs ml-1 flex-shrink-0 ${categoriaActiva === cat ? 'text-green-600' : 'text-gray-400'}`}>{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* Lista de productos */}
              <div className="flex-1 min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">{productosFiltrados.length}</span>
                    {' '}producto{productosFiltrados.length !== 1 ? 's' : ''}
                    {categoriaActiva !== 'Todas' && <span className="text-gray-400"> en {categoriaActiva}</span>}
                  </p>
                  <button
                    onClick={() => { setEditandoProducto(null); setShowFormProducto(true) }}
                    className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                  >
                    <Plus size={15} /> Nuevo producto
                  </button>
                </div>

                {/* Tabla de productos */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {productosFiltrados.length === 0 ? (
                    <div className="text-center py-16">
                      <Package size={40} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm mb-4">
                        {productos.length === 0 ? 'Aún no tienes productos' : 'Sin productos en esta categoría'}
                      </p>
                      {productos.length === 0 && (
                        <button
                          onClick={() => { setEditandoProducto(null); setShowFormProducto(true) }}
                          className="btn-primary text-sm"
                        >
                          Publicar mi primer producto
                        </button>
                      )}
                    </div>
                  ) : (
                    productosFiltrados.map((p, i) => (
                      <FilaProducto
                        key={p.id_producto}
                        producto={p}
                        border={i > 0}
                        onEditar={() => { setEditandoProducto(p); setShowFormProducto(true) }}
                        onToggle={() => handleToggleActivo(p)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab Mi Tienda ── */}
          {tab === 'tienda' && <FormTienda token={token!} tienda={tienda} onSaved={setTienda} />}

          {/* ── Tab Admin ── */}
          {tab === 'admin' && <AdminPanel token={token!} />}
        </main>
      </div>

      {/* Modal formulario producto */}
      {showFormProducto && (
        <FormProducto
          token={token!}
          tiendaId={tienda?.id_tienda ?? ''}
          producto={editandoProducto}
          onClose={() => setShowFormProducto(false)}
          onSaved={(p) => {
            if (editandoProducto) setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? p : x))
            else setProductos(prev => [p, ...prev])
            setShowFormProducto(false)
          }}
        />
      )}
    </div>
  )
}

// ── Fila de producto (estilo OlaClick) ────────────────────────────────────────

function FilaProducto({ producto: p, border, onEditar, onToggle }: {
  producto: Producto
  border: boolean
  onEditar: () => void
  onToggle: () => void
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${border ? 'border-t border-gray-100' : ''}`}>
      {/* Imagen */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {p.imagenes?.[0]
          ? <img src={p.imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{p.categoria}</span>
          {p.tipo === 'fisico' && p.stock != null && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${(p.stock ?? 1) <= 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
              Stock: {p.stock}
            </span>
          )}
        </div>
      </div>

      {/* Precio */}
      <p className="text-sm font-semibold text-gray-800 flex-shrink-0 hidden sm:block">
        ${Number(p.precio).toLocaleString('es-CO')}
      </p>

      {/* Toggle activo */}
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          p.activo ? 'bg-green-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={p.activo}
        title={p.activo ? 'Desactivar' : 'Activar'}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          p.activo ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </button>

      {/* Editar */}
      <button
        onClick={onEditar}
        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        title="Editar"
      >
        <Pencil size={14} />
      </button>
    </div>
  )
}

// ── Tab Resumen ───────────────────────────────────────────────────────────────

function TabResumen({ ordenes, totalVentas, pendientes, esVendedor }: {
  ordenes: Orden[]
  totalVentas: number
  pendientes: number
  esVendedor: boolean
}) {
  const { usuario } = useAuthStore()
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: TrendingUp, label: esVendedor ? 'Ventas totales' : 'Gastado', value: `$${totalVentas.toLocaleString('es-CO')}`, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: ShoppingBag, label: esVendedor ? 'Total órdenes' : 'Mis órdenes', value: ordenes.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Clock, label: 'Pendientes', value: pendientes, color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Star, label: 'Rating', value: Number(usuario?.rating_promedio ?? 0).toFixed(1), color: 'text-yellow-500', bg: 'bg-yellow-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            {esVendedor ? 'Ventas recientes' : 'Órdenes recientes'}
          </h2>
        </div>
        {ordenes.length === 0 ? (
          <p className="text-gray-400 text-center py-10 text-sm">Sin órdenes aún</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {ordenes.slice(0, 10).map(o => (
              <Link
                key={o.id_orden}
                to={`/mis-ordenes/${o.id_orden}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    #{o.id_orden.slice(0, 8).toUpperCase()}
                    <ExternalLink size={11} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString('es-CO')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">${Number(o.total).toLocaleString('es-CO')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    o.estado === 'completada' ? 'bg-green-100 text-green-700' :
                    o.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{o.estado}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Banner Solicitud de Rol ───────────────────────────────────────────────────

function BannerSolicitudRol({ solicitud, onSolicitud }: {
  token?: string
  solicitud: Solicitud | null
  onSolicitud: (s: Solicitud) => void
}) {
  const [motivacion, setMotivacion] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  if (solicitud?.estado === 'aprobada') return null

  async function enviar() {
    setLoading(true); setError('')
    try {
      const res = await api.post('/api/solicitudes', { rol_solicitado: 'vendedor', motivacion })
      onSolicitud(res.data.data); setShow(false)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al enviar')
    } finally { setLoading(false) }
  }

  if (solicitud?.estado === 'pendiente') return (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <Clock size={18} className="text-yellow-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-yellow-800">Solicitud de vendedor en revisión</p>
        <p className="text-xs text-yellow-600">Te avisaremos cuando el equipo la apruebe.</p>
      </div>
    </div>
  )

  if (solicitud?.estado === 'rechazada') return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <p className="text-sm font-medium text-red-800">Tu solicitud fue rechazada.</p>
      <p className="text-xs text-red-600">Puedes volver a intentarlo con más información.</p>
      <button onClick={() => setShow(true)} className="mt-2 text-xs text-red-700 underline">Enviar nueva solicitud</button>
    </div>
  )

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
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Formulario de Producto ────────────────────────────────────────────────────

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
    e.preventDefault(); setLoading(true); setError('')
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
        ? await api.put(`/api/productos/${savedId}`, body)
        : await api.post('/api/productos', body)
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
      await api.delete(`/api/uploads/imagenes/${id}`)
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
              {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (savedId ? 'Guardar cambios' : 'Publicar')}
            </button>
          </div>
        </form>

        {savedId && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Imágenes</p>
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
                <p className="text-sm text-gray-400">Clic para subir foto</p>
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

// ── Formulario de Tienda ──────────────────────────────────────────────────────

function FormTienda({ tienda, onSaved }: { token?: string; tienda: Tienda | null; onSaved: (t: Tienda) => void }) {
  const [form, setForm] = useState({ nombre_tienda: tienda?.nombre_tienda ?? '', descripcion: tienda?.descripcion ?? '' })
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setOk(false)
    try {
      const res = tienda
        ? await api.put('/api/tiendas/mi-tienda', form)
        : await api.post('/api/tiendas', form)
      onSaved(res.data.data); setOk(true)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-green-700" />
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
            {tienda._count && <> · <span className="font-medium">{tienda._count.productos}</span> productos</>}
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {ok && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} /> Guardado</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (tienda ? 'Guardar cambios' : 'Crear tienda')}
        </button>
      </form>
    </div>
  )
}

// ── Panel Admin ───────────────────────────────────────────────────────────────

interface SolicitudAdmin {
  id_solicitud: string
  rol_solicitado: string
  motivacion?: string
  estado: string
  created_at: string
  usuario: { nombre: string; email: string; facultad?: string }
}

function AdminPanel({ token: _token }: { token: string }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/solicitudes').then(r => setSolicitudes(r.data.data)).finally(() => setLoading(false))
  }, [])

  async function decidir(id: string, decision: 'aprobada' | 'rechazada') {
    setProcesando(id)
    try {
      await api.patch(`/api/solicitudes/${id}`, { decision })
      setSolicitudes(prev => prev.filter(s => s.id_solicitud !== id))
    } catch { /* silencioso */ }
    finally { setProcesando(null) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Solicitudes de rol pendientes</h2>
      </div>
      {loading ? <div className="h-20 m-4 bg-gray-100 rounded-xl animate-pulse" /> :
        solicitudes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={36} className="mx-auto text-green-400 mb-2" />
            <p className="text-gray-500 text-sm">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {solicitudes.map(s => (
              <div key={s.id_solicitud} className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{s.usuario.nombre}</p>
                    <p className="text-xs text-gray-500">{s.usuario.email} · {s.usuario.facultad ?? 'Sin facultad'}</p>
                    <p className="text-xs text-gray-400 mt-1">Solicita: <span className="font-medium text-green-700">{s.rol_solicitado}</span></p>
                    {s.motivacion && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded p-2 italic">"{s.motivacion}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decidir(s.id_solicitud, 'rechazada')} disabled={procesando === s.id_solicitud}
                      className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 transition-colors">
                      Rechazar
                    </button>
                    <button onClick={() => decidir(s.id_solicitud, 'aprobada')} disabled={procesando === s.id_solicitud}
                      className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg hover:bg-green-800 transition-colors flex items-center gap-1">
                      {procesando === s.id_solicitud ? <Loader2 size={12} className="animate-spin" /> : null}
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
