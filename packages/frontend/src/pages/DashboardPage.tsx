import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Package, ShoppingBag, Star, TrendingUp, Plus, Store,
  Loader2, X, Upload, Trash2, Send, CheckCircle, Clock, ExternalLink,
  LayoutDashboard, Settings, Shield, Eye, EyeOff, ChevronRight,
  ChevronDown, ChevronUp, GripVertical, MoreVertical, Boxes,
  Search, AlertCircle, MapPin, ClipboardList, Truck, Ban,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api.ts'
import axios from 'axios'
import { getSocket } from '../lib/socket.ts'
import { useAuthStore } from '../store/auth.ts'
import type { Orden, OrdenEstado, Producto } from '@marketplace/shared'

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

type Tab = 'resumen' | 'pedidos' | 'menu' | 'inventario' | 'tienda' | 'admin'

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
  const [drawerProducto, setDrawerProducto] = useState<Producto | null | 'nuevo'>(null)
  const [categoriaPreset, setCategoriaPreset] = useState<string>('')

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
    const prev = [...productos]
    setProductos(ps => ps.map(x => x.id_producto === p.id_producto ? { ...x, activo: !x.activo } : x))
    try {
      await api.put(`/api/productos/${p.id_producto}`, { activo: !p.activo })
    } catch { setProductos(prev) }
  }

  function abrirNuevoEnCategoria(cat: string) {
    setCategoriaPreset(cat)
    setDrawerProducto('nuevo')
  }

  function abrirEditar(p: Producto) {
    setCategoriaPreset(p.categoria)
    setDrawerProducto(p)
  }

  function cerrarDrawer() { setDrawerProducto(null) }

  function onProductoGuardado(p: Producto) {
    if (drawerProducto !== 'nuevo') {
      setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? p : x))
    } else {
      setProductos(prev => [p, ...prev])
    }
    cerrarDrawer()
  }

  const ordenesResumen = esVendedor ? ventas : ordenes
  const completadas = ordenesResumen.filter(o => o.estado === 'completada')
  const totalVentas = completadas.reduce((s, o) => s + Number(o.total), 0)
  const totalNeto = completadas.reduce((s, o) => s + (o.monto_vendedor != null ? Number(o.monto_vendedor) : Number(o.total) * 0.85), 0)
  const pendientes = ordenesResumen.filter(o => o.estado === 'pendiente').length

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )

  if (!esVendedor) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
        <p className="text-gray-500 mb-6">Bienvenido, {usuario?.nombre}</p>
        {esComprador && <BannerSolicitudRol token={token!} solicitud={solicitud} onSolicitud={setSolicitud} />}
        {ordenes.length > 0 && (
          <div className="mb-5">
            <Link to="/mis-pedidos"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <ClipboardList size={16} className="text-green-700" />
              Ver mis pedidos ({ordenes.length})
              <ChevronRight size={14} className="ml-auto text-gray-400" />
            </Link>
          </div>
        )}
        <TabResumen ordenes={ordenes} totalVentas={0} pendientes={pendientes} esVendedor={false} />
      </div>
    )
  }

  const NAV: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { key: 'pedidos', label: 'Pedidos', icon: ClipboardList, badge: ventas.filter(o => o.estado === 'pendiente' || o.estado === 'pagada').length || undefined },
    { key: 'menu', label: 'Menú', icon: Package },
    { key: 'inventario', label: 'Inventario', icon: Boxes },
    { key: 'tienda', label: 'Mi tienda', icon: Store },
    ...(esAdmin ? [{ key: 'admin' as Tab, label: 'Admin', icon: Shield }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
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
            <Link to={`/tienda/${tienda.id_tienda}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-700 font-medium transition-colors flex-shrink-0">
              <Eye size={14} /> Ver tienda
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {NAV.map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left border-l-2 ${
                  tab === key
                    ? 'bg-green-50 text-green-700 border-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-transparent'
                }`}>
                <Icon size={16} />
                {label}
                {badge ? (
                  <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {badge}
                  </span>
                ) : (tab === key && <ChevronRight size={14} className="ml-auto opacity-50" />)}
              </button>
            ))}
          </nav>

          <div className="mt-3">
            <Link to="/perfil"
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 rounded-xl border border-gray-200 bg-white transition-colors">
              <Settings size={15} /> Mi cuenta
            </Link>
          </div>

          <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400">Ingresos netos</p>
              <p className="text-lg font-bold text-green-700">${totalNeto.toLocaleString('es-CO')}</p>
              <p className="text-[10px] text-gray-400">Bruto: ${totalVentas.toLocaleString('es-CO')} · com. 15%</p>
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

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile nav */}
          <div className="flex gap-1 mb-5 bg-white border border-gray-200 p-1 rounded-xl md:hidden overflow-x-auto scrollbar-hide">
            {NAV.map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === key ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={13} /> {label}
                {badge ? (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {tab === 'resumen' && (
            <TabResumen ordenes={ventas} totalVentas={totalVentas} totalNeto={totalNeto} pendientes={pendientes} esVendedor />
          )}

          {tab === 'pedidos' && (
            <TabPedidos ventas={ventas} onEstadoChange={(id, estado) => {
              setVentas(prev => prev.map(o => o.id_orden === id ? { ...o, estado } : o))
            }} />
          )}

          {tab === 'menu' && (
            <TabMenu
              productos={productos}
              tienda={tienda}
              onToggle={handleToggleActivo}
              onEditar={abrirEditar}
              onNuevoEnCategoria={abrirNuevoEnCategoria}
              onNuevo={() => { setCategoriaPreset(''); setDrawerProducto('nuevo') }}
            />
          )}

          {tab === 'inventario' && (
            <TabInventario
              productos={productos}
              onToggle={handleToggleActivo}
            />
          )}

          {tab === 'tienda' && (
            <FormTienda token={token!} tienda={tienda} onSaved={setTienda} />
          )}
          {tab === 'admin' && <AdminPanel token={token!} />}
        </main>
      </div>

      {/* Right drawer para editar/crear producto */}
      <DrawerProducto
        open={drawerProducto !== null}
        producto={drawerProducto === 'nuevo' ? null : drawerProducto}
        categoriaInicial={categoriaPreset}
        token={token!}
        tiendaId={tienda?.id_tienda ?? ''}
        onClose={cerrarDrawer}
        onSaved={onProductoGuardado}
      />
    </div>
  )
}

// ── Tab Menú (accordion de categorías) ───────────────────────────────────────

function TabMenu({ productos, tienda, onToggle, onEditar, onNuevoEnCategoria, onNuevo }: {
  productos: Producto[]
  tienda: Tienda | null
  onToggle: (p: Producto) => void
  onEditar: (p: Producto) => void
  onNuevoEnCategoria: (cat: string) => void
  onNuevo: () => void
}) {
  const categorias = Array.from(new Set(productos.map(p => p.categoria)))
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set(categorias))
  const [catTab, setCatTab] = useState<string>('Categorías')

  const grupos = categorias.map(cat => ({
    cat,
    prods: productos.filter(p => p.categoria === cat),
  }))

  const gruposFiltrados = catTab === 'Categorías'
    ? grupos
    : grupos.filter(g => g.cat === catTab)

  function toggle(cat: string) {
    setExpandidas(prev => {
      const s = new Set(prev)
      s.has(cat) ? s.delete(cat) : s.add(cat)
      return s
    })
  }

  return (
    <div>
      {/* Store info bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {tienda ? <Store size={24} className="text-gray-400" /> : <div className="w-full h-full bg-gray-200" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">Tienda</p>
          <p className="font-semibold text-gray-800 truncate">{tienda?.nombre_tienda ?? '—'}</p>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {productos.length} producto{productos.length !== 1 ? 's' : ''}
        </span>
        <button onClick={onNuevo}
          className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex-shrink-0">
          <Plus size={14} /> Producto
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-0 bg-white rounded-xl border border-gray-200 mb-4 overflow-x-auto scrollbar-hide">
        {['Categorías', ...categorias].map(cat => (
          <button key={cat} onClick={() => setCatTab(cat)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative flex-shrink-0 ${
              catTab === cat ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {cat}
            {catTab === cat && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t" />}
          </button>
        ))}
      </div>

      {/* Categorías accordion */}
      <div className="space-y-2">
        {gruposFiltrados.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
            <Package size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm mb-4">No hay productos aún</p>
            <button onClick={onNuevo} className="btn-primary text-sm">
              Publicar primer producto
            </button>
          </div>
        )}

        {gruposFiltrados.map(({ cat, prods }) => {
          const abierta = expandidas.has(cat)
          return (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header categoría */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <GripVertical size={16} className="text-gray-300 flex-shrink-0 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">Categoría</p>
                  <p className="font-semibold text-gray-800 text-sm">{cat}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{prods.length}</span>
                <button
                  onClick={() => onNuevoEnCategoria(cat)}
                  className="flex items-center gap-1 text-xs text-blue-600 border border-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0">
                  <Plus size={12} /> Producto
                </button>
                <button className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                  <MoreVertical size={15} className="text-gray-400" />
                </button>
                <button onClick={() => toggle(cat)} className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                  {abierta ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
                </button>
              </div>

              {/* Productos de la categoría */}
              {abierta && prods.map((p, i) => (
                <div key={p.id_producto}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${i > 0 ? 'border-t border-gray-100' : ''}`}
                  onClick={() => onEditar(p)}>
                  <GripVertical size={14} className="text-gray-200 flex-shrink-0 cursor-grab" onClick={e => e.stopPropagation()} />

                  {/* Imagen */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.imagenes?.[0]
                      ? <img src={p.imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                    {p.descripcion && (
                      <p className="text-xs text-gray-400 truncate">{p.descripcion}</p>
                    )}
                  </div>

                  {/* Precio */}
                  <p className="text-sm font-semibold text-gray-800 flex-shrink-0 hidden sm:block">
                    ${Number(p.precio).toLocaleString('es-CO')}
                  </p>

                  {/* Visibility toggle */}
                  <button
                    onClick={e => { e.stopPropagation(); onToggle(p) }}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      p.activo ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 hover:bg-gray-100'
                    }`}
                    title={p.activo ? 'Visible — clic para ocultar' : 'Oculto — clic para mostrar'}>
                    {p.activo ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  <button
                    onClick={e => { e.stopPropagation(); onEditar(p) }}
                    className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
                    <MoreVertical size={15} className="text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tab Inventario ────────────────────────────────────────────────────────────

function TabInventario({ productos, onToggle }: {
  productos: Producto[]
  onToggle: (p: Producto) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'disponible' | 'agotado'>('todos')

  const fisicos = productos.filter(p => p.tipo === 'fisico')
  const disponibles = fisicos.filter(p => p.activo && (p.stock ?? 1) > 0)
  const agotados = fisicos.filter(p => !p.activo || (p.stock !== null && p.stock !== undefined && p.stock <= 0))

  const categorias = Array.from(new Set(productos.map(p => p.categoria)))

  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    if (!coincideBusqueda) return false
    if (filtro === 'disponible') return p.activo && (p.stock === null || p.stock === undefined || p.stock > 0)
    if (filtro === 'agotado') return !p.activo || (p.stock !== null && p.stock !== undefined && p.stock <= 0)
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Inventario</h2>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 flex-1 text-sm">
          <button onClick={() => setFiltro('todos')}
            className={`flex items-center gap-1.5 font-medium transition-colors ${filtro === 'todos' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            {productos.length} Total
          </button>
          <button onClick={() => setFiltro('disponible')}
            className={`flex items-center gap-1.5 font-medium transition-colors ${filtro === 'disponible' ? 'text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {disponibles.length} Disponible
          </button>
          <span className="text-gray-200">|</span>
          <button onClick={() => setFiltro('agotado')}
            className={`flex items-center gap-1.5 font-medium transition-colors ${filtro === 'agotado' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <AlertCircle size={13} className={filtro === 'agotado' ? 'text-red-500' : 'text-gray-300'} />
            {agotados.length} Agotado
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar un producto"
            className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-400 w-44"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_140px_140px_100px] gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Productos</p>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Control de stock</p>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Disponibilidad</p>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Inventario</p>
        </div>

        {/* Rows grouped by category */}
        {categorias.map(cat => {
          const prodsCat = productosFiltrados.filter(p => p.categoria === cat)
          if (prodsCat.length === 0) return null
          return (
            <div key={cat}>
              <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{cat}</p>
              </div>
              {prodsCat.map(p => {
                const stockControlado = p.tipo === 'fisico' && p.stock !== null && p.stock !== undefined
                const agotado = !p.activo || (stockControlado && (p.stock ?? 1) <= 0)
                return (
                  <div key={p.id_producto}
                    className="grid grid-cols-[1fr_140px_140px_100px] gap-4 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 items-center">
                    <p className="text-sm text-gray-800 font-medium truncate">{p.nombre}</p>

                    {/* Control de stock toggle */}
                    <div className="flex items-center">
                      <button
                        onClick={() => onToggle(p)}
                        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                          p.activo ? 'bg-green-600' : 'bg-gray-200'
                        }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          p.activo ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Disponibilidad chip */}
                    <div>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                        agotado ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${agotado ? 'bg-red-400' : 'bg-green-500'}`} />
                        {agotado ? 'Agotado' : 'Disponible'}
                      </span>
                    </div>

                    {/* Stock */}
                    <p className="text-sm text-gray-600">
                      {p.tipo === 'servicio' ? '—' : (p.stock !== null && p.stock !== undefined ? p.stock : '∞')}
                    </p>
                  </div>
                )
              })}
            </div>
          )
        })}

        {productosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Package size={36} className="mx-auto text-gray-200 mb-2" />
            <p className="text-gray-400 text-sm">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Right Drawer para producto ────────────────────────────────────────────────

const CATEGORIAS = ['artesanías', 'papelería', 'tecnología', 'alimentos', 'tutorías', 'soporte técnico', 'diseño gráfico']

function DrawerProducto({ open, producto, categoriaInicial, token, onClose, onSaved }: {
  open: boolean
  producto: Producto | null
  categoriaInicial: string
  token: string
  tiendaId?: string
  onClose: () => void
  onSaved: (p: Producto) => void
}) {
  const headers = { Authorization: `Bearer ${token}` }
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    tipo: 'fisico' as 'fisico' | 'servicio',
    categoria: categoriaInicial || CATEGORIAS[0],
    stock: '',
  })
  const [imagenes, setImagenes] = useState<NonNullable<Producto['imagenes']>>([])
  const [savedId, setSavedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (producto) {
      setForm({
        nombre: producto.nombre,
        descripcion: producto.descripcion ?? '',
        precio: String(producto.precio),
        tipo: (producto.tipo ?? 'fisico') as 'fisico' | 'servicio',
        categoria: producto.categoria,
        stock: producto.stock != null ? String(producto.stock) : '',
      })
      setImagenes(producto.imagenes ?? [] as NonNullable<Producto['imagenes']>)
      setSavedId(producto.id_producto)
    } else {
      setForm({ nombre: '', descripcion: '', precio: '', tipo: 'fisico', categoria: categoriaInicial || CATEGORIAS[0], stock: '' })
      setImagenes([])
      setSavedId('')
    }
    setError('')
  }, [open, producto, categoriaInicial])

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
      const res = await api.post(`/api/uploads/producto/${savedId}/imagenes`, fd, {
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
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-800">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scroll content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Imagen principal */}
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                {imagenes[0]
                  ? <img src={imagenes[0].url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Upload size={20} className="text-gray-300" />
                    </div>
                }
              </div>
              {savedId && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors">
                  {uploading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            {imagenes.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {imagenes.slice(1).map(img => (
                  <div key={img.id_imagen} className="relative w-14 h-14 rounded-lg overflow-hidden group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleDeleteImg(img.id_imagen)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} id="form-producto" className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <input value={form.nombre} onChange={e => field('nombre', e.target.value)}
                className="input text-sm" required minLength={2} placeholder="Nombre del producto" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={e => field('descripcion', e.target.value)}
                className="input resize-none text-sm" rows={3} placeholder="Describe el producto..." />
            </div>

            {/* Precio */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Precio(s)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 mb-1">Precio</p>
                  <input type="number" min="0" value={form.precio} onChange={e => field('precio', e.target.value)}
                    className="input text-sm" required placeholder="0" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => field('tipo', e.target.value as 'fisico' | 'servicio')} className="input text-sm">
                  <option value="fisico">Físico</option>
                  <option value="servicio">Servicio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                <select value={form.categoria} onChange={e => field('categoria', e.target.value)} className="input text-sm">
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Control de stock */}
            {form.tipo === 'fisico' && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Control de Stock</p>
                  <p className="text-xs text-gray-400">Controla las unidades disponibles</p>
                </div>
                <div className="flex items-center gap-3">
                  {form.stock !== '' && (
                    <input type="number" min="0" value={form.stock} onChange={e => field('stock', e.target.value)}
                      className="w-20 text-sm px-2 py-1.5 border border-gray-200 rounded-lg text-center" placeholder="0" />
                  )}
                  <button type="button"
                    onClick={() => field('stock', form.stock === '' ? '0' : '')}
                    className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      form.stock !== '' ? 'bg-green-600' : 'bg-gray-200'
                    }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      form.stock !== '' ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>

          {/* Galería adicional */}
          {savedId && imagenes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Imágenes adicionales</p>
              <div className="flex gap-2 flex-wrap">
                {imagenes.map(img => (
                  <div key={img.id_imagen} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.es_principal && (
                      <span className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[9px] text-center">Principal</span>
                    )}
                    <button onClick={() => handleDeleteImg(img.id_imagen)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={8} />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 hover:border-blue-400 hover:text-blue-400 transition-colors">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="form-producto" disabled={loading}
            className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : (savedId ? 'Guardar cambios' : 'Publicar')}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Tab Resumen ───────────────────────────────────────────────────────────────

function TabResumen({ ordenes, totalVentas, totalNeto, pendientes, esVendedor }: {
  ordenes: Orden[]
  totalVentas: number
  totalNeto?: number
  pendientes: number
  esVendedor: boolean
}) {
  const { usuario } = useAuthStore()
  const comisionTotal = totalVentas - (totalNeto ?? totalVentas)
  return (
    <>
      {esVendedor && totalVentas > 0 && (
        <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Desglose de ingresos</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[11px] text-gray-400">Total cobrado al cliente</p>
              <p className="text-base font-bold text-gray-800">${totalVentas.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-gray-300 text-lg">−</div>
            <div className="flex-1">
              <p className="text-[11px] text-gray-400">Comisión plataforma (15%)</p>
              <p className="text-base font-bold text-red-500">−${comisionTotal.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-gray-300 text-lg">=</div>
            <div className="flex-1">
              <p className="text-[11px] text-gray-400">Tus ingresos netos</p>
              <p className="text-base font-bold text-green-600">${(totalNeto ?? totalVentas).toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: TrendingUp, label: esVendedor ? 'Ingresos netos' : 'Gastado', value: `$${(esVendedor ? (totalNeto ?? totalVentas) : totalVentas).toLocaleString('es-CO')}`, color: 'text-green-600', bg: 'bg-green-50' },
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
              <Link key={o.id_orden} to={`/mis-ordenes/${o.id_orden}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group">
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
          <textarea value={motivacion} onChange={e => setMotivacion(e.target.value)}
            placeholder="Cuéntanos brevemente qué quieres vender (opcional)..."
            className="input resize-none text-sm" rows={3} />
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

// ── Formulario de Tienda ──────────────────────────────────────────────────────

interface TiendaExtendida extends Tienda {
  logo_url?: string | null
  banner_url?: string | null
  ubicacion?: string | null
}

function FormTienda({ token, tienda, onSaved }: {
  token?: string
  tienda: TiendaExtendida | null
  onSaved: (t: TiendaExtendida) => void
}) {
  const headers = { Authorization: `Bearer ${token}` }
  const [form, setForm] = useState({
    nombre_tienda: tienda?.nombre_tienda ?? '',
    descripcion: tienda?.descripcion ?? '',
    ubicacion: tienda?.ubicacion ?? '',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(tienda?.logo_url ?? null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(tienda?.banner_url ?? null)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setOk(false)
    try {
      const res = tienda
        ? await api.put('/api/tiendas/mi-tienda', form)
        : await api.post('/api/tiendas', form)
      onSaved({ ...res.data.data, logo_url: logoUrl, banner_url: bannerUrl }); setOk(true)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar')
    } finally { setLoading(false) }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(true)
    try {
      const fd = new FormData(); fd.append('imagen', file)
      const res = await api.post('/api/uploads/tienda/logo', fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      })
      setLogoUrl(res.data.data.logo_url)
    } catch { setError('Error al subir logo') }
    finally { setUploadingLogo(false); if (logoRef.current) logoRef.current.value = '' }
  }

  async function handleBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingBanner(true)
    try {
      const fd = new FormData(); fd.append('imagen', file)
      const res = await api.post('/api/uploads/tienda/banner', fd, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      })
      setBannerUrl(res.data.data.banner_url)
    } catch { setError('Error al subir portada') }
    finally { setUploadingBanner(false); if (bannerRef.current) bannerRef.current.value = '' }
  }

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Vista previa / Imágenes ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Banner */}
        <div className="relative h-36 bg-gray-100 group">
          {bannerUrl
            ? <img src={bannerUrl} alt="Portada" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                <Upload size={24} className="mb-1" />
                <p className="text-xs">Agregar portada</p>
              </div>
          }
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            disabled={uploadingBanner}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {uploadingBanner
              ? <Loader2 size={12} className="animate-spin" />
              : <Upload size={12} />}
            {uploadingBanner ? 'Subiendo...' : 'Cambiar portada'}
          </button>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        </div>

        {/* Logo sobre el banner */}
        <div className="px-4 pb-4 flex items-end gap-4 -mt-8">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Store size={28} className="text-gray-300" />
                  </div>
              }
            </div>
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-700 hover:bg-green-800 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
            >
              {uploadingLogo
                ? <Loader2 size={11} className="animate-spin" />
                : <Upload size={11} />}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>
          <div className="pb-1">
            <p className="font-semibold text-gray-800">{form.nombre_tienda || 'Nombre de la tienda'}</p>
            {tienda && (
              <span className={`text-xs font-medium ${tienda.estado === 'activa' ? 'text-green-600' : 'text-yellow-600'}`}>
                ● {tienda.estado}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Datos de la tienda ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={16} className="text-green-700" />
          <h2 className="font-semibold text-gray-800 text-sm">Información de la tienda</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de la tienda *</label>
            <input
              value={form.nombre_tienda}
              onChange={e => setForm(f => ({ ...f, nombre_tienda: e.target.value }))}
              className="input" required minLength={2}
              placeholder="Ej: Artesanías Wayuu de María"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="input resize-none" rows={3}
              placeholder="Cuéntale a tus compradores qué vendes..."
            />
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Ubicación física
              <span className="text-gray-400 font-normal ml-1">(para clientes que quieran visitarte)</span>
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.ubicacion}
                onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                className="input pl-9 text-sm"
                placeholder="Ej: Edificio Los Álamos, Of. 302, Riohacha"
              />
            </div>
            {form.ubicacion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.ubicacion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline mt-1 inline-flex items-center gap-1"
              >
                <ExternalLink size={11} /> Ver en Google Maps
              </a>
            )}
          </div>

          {tienda && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
              Estado: <span className={`font-medium ${tienda.estado === 'activa' ? 'text-green-700' : 'text-yellow-600'}`}>{tienda.estado}</span>
              {tienda._count && <> · <span className="font-medium">{tienda._count.productos}</span> productos</>}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {ok && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={14} /> Cambios guardados</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (tienda ? 'Guardar cambios' : 'Crear tienda')}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Formulario Cuenta Bancaria (para liquidaciones) ──────────────────────────

// ── Tab Pedidos (vendedor) — estilo OlaClick ─────────────────────────────────

const ESTADO_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente',   color: 'text-orange-700', bg: 'bg-orange-100' },
  pagada:     { label: 'En curso',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  en_entrega: { label: 'En entrega',  color: 'text-indigo-700', bg: 'bg-indigo-100' },
  completada: { label: 'Completada',  color: 'text-green-700',  bg: 'bg-green-100'  },
  cancelada:  { label: 'Cancelada',   color: 'text-red-600',    bg: 'bg-red-100'    },
}

function useTicker(dateStr: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const base = Date.now() - new Date(dateStr).getTime()
    setElapsed(Math.floor(base / 1000))
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [dateStr])
  const h  = Math.floor(elapsed / 3600)
  const m  = Math.floor((elapsed % 3600) / 60)
  const s  = elapsed % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}min`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} seg`
}

function FilaPedido({ orden, idx, onEstadoChange }: {
  orden: Orden
  idx: number
  onEstadoChange: (id: string, estado: OrdenEstado) => void
}) {
  const [cambiando, setCambiando] = useState<string | null>(null)
  const timer = useTicker(orden.created_at)
  const chip  = ESTADO_CHIP[orden.estado]
  const items = orden.items ?? []
  const resumen = items.slice(0, 2).map(i => `${i.cantidad}x ${i.producto?.nombre ?? '…'}`).join(', ')
  const extra   = items.length > 2 ? ` +${items.length - 2}` : ''
  const fecha   = new Date(orden.created_at).toLocaleString('es-CO', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
  const esPagada = ['pagada','en_entrega','completada'].includes(orden.estado)

  async function cambiarEstado(nuevoEstado: OrdenEstado) {
    setCambiando(nuevoEstado)
    try {
      await api.patch(`/api/ordenes/${orden.id_orden}/estado`, { estado: nuevoEstado })
      onEstadoChange(orden.id_orden, nuevoEstado)
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : 'Error al cambiar estado'
      alert(msg)
    } finally { setCambiando(null) }
  }

  return (
    <div className={`flex items-center gap-0 border-b border-gray-100 hover:bg-gray-50 transition-colors ${orden.estado === 'cancelada' ? 'opacity-60' : ''}`}>
      {/* FECHA */}
      <div className="w-44 flex-shrink-0 px-4 py-3">
        <p className="text-xs font-semibold text-blue-600">
          #{idx + 1} 🛵 A domicilio
        </p>
        <p className="text-[11px] text-orange-500 flex items-center gap-1 mt-0.5">
          <Clock size={10} /> {orden.estado === 'completada' || orden.estado === 'cancelada' ? fecha : timer}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
          WEB · {orden.id_orden.slice(-8).toUpperCase()}
        </p>
        <p className="text-[10px] text-gray-400">{fecha}</p>
      </div>

      {/* ESTADO */}
      <div className="w-36 flex-shrink-0 px-3 py-3 flex flex-col gap-1.5">
        <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${chip.color} ${chip.bg} w-fit`}>
          {chip.label}
        </span>
        <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded w-fit ${
          esPagada ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {esPagada ? 'Pagado' : 'No pagado'}
        </span>
      </div>

      {/* TOTAL */}
      <div className="w-32 flex-shrink-0 px-3 py-3">
        <p className="text-xs text-gray-400 line-through">${Number(orden.total).toLocaleString('es-CO')}</p>
        <p className="text-sm font-bold text-green-600">
          ${(orden.monto_vendedor != null ? Number(orden.monto_vendedor) : Number(orden.total) * 0.85).toLocaleString('es-CO')}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          -{orden.comision_porcentaje ?? 15}% plat. · {orden.metodo_pago}
        </p>
      </div>

      {/* CLIENTE */}
      <div className="flex-1 min-w-0 px-3 py-3">
        <p className="text-sm font-medium text-gray-800 truncate">{orden.comprador?.nombre ?? 'Comprador'}</p>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{resumen}{extra}</p>
      </div>

      {/* ACCIONES */}
      <div className="flex-shrink-0 px-3 py-3 flex items-center gap-2">
        {orden.estado === 'pendiente' && (
          <>
            <button
              onClick={() => cambiarEstado('cancelada')}
              disabled={!!cambiando}
              className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
              {cambiando === 'cancelada' ? <Loader2 size={12} className="animate-spin" /> : '✕ Cancelar'}
            </button>
            <button
              onClick={() => cambiarEstado('en_entrega')}
              disabled={!!cambiando}
              className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-green-600 hover:text-white text-gray-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
              {cambiando === 'en_entrega' ? <Loader2 size={12} className="animate-spin" /> : '✓ Aceptar'}
            </button>
          </>
        )}
        {orden.estado === 'pagada' && (
          <>
            <button
              onClick={() => cambiarEstado('cancelada')}
              disabled={!!cambiando}
              className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
              ✕ Cancelar
            </button>
            <button
              onClick={() => cambiarEstado('en_entrega')}
              disabled={!!cambiando}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
              {cambiando === 'en_entrega' ? <Loader2 size={12} className="animate-spin" /> : <><Truck size={11} /> Enviar</>}
            </button>
          </>
        )}
        {orden.estado === 'en_entrega' && (
          <button
            onClick={() => cambiarEstado('completada')}
            disabled={!!cambiando}
            className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1">
            {cambiando === 'completada' ? <Loader2 size={12} className="animate-spin" /> : <><CheckCircle size={11} /> Completar</>}
          </button>
        )}
        {orden.estado === 'completada' && (
          <span className="text-xs text-green-600 flex items-center gap-1 px-2"><CheckCircle size={12} /> Listo</span>
        )}
        {orden.estado === 'cancelada' && (
          <span className="text-xs text-red-400 flex items-center gap-1 px-2"><Ban size={12} /> Cancelada</span>
        )}
      </div>
    </div>
  )
}

function TabPedidos({ ventas, onEstadoChange }: {
  ventas: Orden[]
  onEstadoChange: (id: string, estado: OrdenEstado) => void
}) {
  const [filtro, setFiltro] = useState<'todo' | 'pendiente' | 'en_curso' | 'completada' | 'cancelada'>('todo')

  const enCurso = ventas.filter(o => o.estado === 'pagada' || o.estado === 'en_entrega')
  const pendientes = ventas.filter(o => o.estado === 'pendiente')
  const completadas = ventas.filter(o => o.estado === 'completada')
  const canceladas = ventas.filter(o => o.estado === 'cancelada')

  const lista = filtro === 'todo'       ? ventas
    : filtro === 'pendiente'  ? pendientes
    : filtro === 'en_curso'   ? enCurso
    : filtro === 'completada' ? completadas
    : canceladas

  const FILTROS = [
    { key: 'todo'      as const, label: 'Todo',       count: ventas.length        },
    { key: 'pendiente' as const, label: 'Pendiente',  count: pendientes.length    },
    { key: 'en_curso'  as const, label: 'En curso',   count: enCurso.length       },
    { key: 'completada'as const, label: 'Completada', count: completadas.length   },
    { key: 'cancelada' as const, label: 'Cancelada',  count: canceladas.length    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Filtros */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b border-gray-100 overflow-x-auto scrollbar-hide">
        <Search size={14} className="text-gray-400 flex-shrink-0 mr-1" />
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filtro === f.key
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.key === 'todo' && filtro === 'todo' && <CheckCircle size={11} />}
            {f.label}
            {f.count > 0 && (
              <span className={`text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 ${
                filtro === f.key ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0 text-xs text-gray-500 pl-2">
          Total: <span className="font-semibold text-gray-700">
            ${lista.reduce((s,o) => s + Number(o.total), 0).toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Tabla con scroll horizontal en móvil */}
      <div className="overflow-x-auto">
        {/* Cabecera tabla */}
        <div className="flex items-center gap-0 bg-gray-50 border-b border-gray-200 px-0 min-w-[640px]">
          <div className="w-44 flex-shrink-0 px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fecha</div>
          <div className="w-36 flex-shrink-0 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Estado</div>
          <div className="w-32 flex-shrink-0 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Cobras</div>
          <div className="flex-1 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Cliente</div>
          <div className="w-52 flex-shrink-0 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Acciones</div>
        </div>

        {/* Filas */}
        {lista.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🍴</div>
            <p className="text-gray-500 text-sm">Crea pedidos para cada tipo de servicio</p>
          </div>
        ) : (
          <div className="min-w-[640px]">
            {lista.map((o, i) => (
              <FilaPedido key={o.id_orden} orden={o} idx={i} onEstadoChange={onEstadoChange} />
            ))}
          </div>
        )}
      </div>
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
