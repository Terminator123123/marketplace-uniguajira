import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Store, Star, MapPin, ShoppingCart, Check, ChevronLeft, Package, Plus, Search, Clock } from 'lucide-react'
import api from '../lib/api.ts'
import { useCartStore } from '../store/cart.ts'

interface ImagenProducto {
  id_imagen: string
  url: string
  orden?: number
  es_principal?: boolean
}

interface ProductoResumen {
  id_producto: string
  nombre: string
  descripcion?: string | null
  precio: number | string
  tipo: string
  categoria: string
  stock: number | null
  imagenes: ImagenProducto[]
}

interface Tienda {
  id_tienda: string
  nombre_tienda: string
  descripcion: string | null
  banner_url: string | null
  estado: string
  created_at: string
  vendedor: {
    nombre: string
    foto_url: string | null
    rating_promedio: number | string
    facultad: string | null
  }
  productos: ProductoResumen[]
}

function TarjetaProducto({ producto, id_tienda, tienda_nombre }: {
  producto: ProductoResumen
  id_tienda: string
  tienda_nombre: string
}) {
  const [agregado, setAgregado] = useState(false)
  const agregar = useCartStore(s => s.agregar)
  const sinStock = producto.tipo === 'fisico' && producto.stock !== null && producto.stock <= 0
  const imagen = producto.imagenes[0]?.url

  function handleAgregar(e: React.MouseEvent) {
    e.preventDefault()
    if (sinStock) return
    agregar({
      id_producto: producto.id_producto,
      id_tienda,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      tipo: producto.tipo as 'fisico' | 'servicio',
      stock: producto.stock ?? undefined,
      imagenes: producto.imagenes.map(img => ({ ...img, orden: img.orden ?? 0, es_principal: img.es_principal ?? false })),
      tienda_nombre,
    })
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  return (
    <Link
      to={`/producto/${producto.id_producto}`}
      className="flex gap-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors -mx-4 px-4"
    >
      {/* Texto */}
      <div className="flex flex-col flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-[15px] leading-snug line-clamp-2">{producto.nombre}</h3>
        {producto.descripcion && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{producto.descripcion}</p>
        )}
        <p className="text-[15px] font-semibold text-gray-900 mt-auto pt-2">
          ${Number(producto.precio).toLocaleString('es-CO')}
        </p>
      </div>

      {/* Imagen */}
      <div className="relative flex-shrink-0 w-[132px] h-[132px]">
        {imagen
          ? <img src={imagen} alt={producto.nombre} className="w-full h-full object-cover rounded-xl" loading="lazy" />
          : <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-4xl">📦</div>
        }

        {sinStock ? (
          <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-full shadow-sm">Sin stock</span>
          </div>
        ) : (
          <button
            onClick={handleAgregar}
            className={`absolute bottom-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all active:scale-95 ${
              agregado ? 'bg-green-500' : 'bg-green-700 hover:bg-green-800'
            }`}
            aria-label="Agregar al carrito"
          >
            {agregado
              ? <Check size={16} className="text-white" />
              : <Plus size={18} className="text-white" />
            }
          </button>
        )}
      </div>
    </Link>
  )
}

export default function TiendaPage() {
  const { id } = useParams<{ id: string }>()
  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    api.get(`/api/tiendas/${id}`)
      .then(r => {
        const data = r.data.data as Tienda
        setTienda(data)
        if (data.productos.length > 0) {
          const primera = data.productos[0].categoria
          setCategoriaActiva(primera)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  // IntersectionObserver: actualiza categoría activa al hacer scroll
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCategoriaActiva(entry.target.getAttribute('data-categoria') ?? '')
            break
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observerRef.current?.observe(el)
    })
  }, [])

  useEffect(() => {
    if (tienda) setupObserver()
    return () => observerRef.current?.disconnect()
  }, [tienda, setupObserver])

  // Scroll al tab activo en el slider
  useEffect(() => {
    if (!sliderRef.current || !categoriaActiva) return
    const btn = sliderRef.current.querySelector(`[data-cat="${CSS.escape(categoriaActiva)}"]`) as HTMLElement
    btn?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [categoriaActiva])

  function scrollToCategoria(cat: string) {
    setCategoriaActiva(cat)
    const el = sectionRefs.current[cat]
    if (el) {
      const offset = 120 // altura del header sticky aprox
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  if (loading) return (
    <div className="animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 py-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
            <div className="w-32 h-32 bg-gray-200 rounded-xl flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )

  if (error || !tienda) return (
    <div className="text-center py-20">
      <Store size={48} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500 mb-4">Tienda no encontrada</p>
      <Link to="/catalogo" className="btn-primary">Ver catálogo</Link>
    </div>
  )

  const categorias = Array.from(new Set(tienda.productos.map(p => p.categoria)))

  const productosFiltrados = busqueda.trim()
    ? tienda.productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : null

  // Agrupar por categoría para mostrar secciones
  const grupos = categorias.map(cat => ({
    cat,
    productos: tienda.productos.filter(p => p.categoria === cat),
  }))

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">

        {/* Info de la tienda */}
        <div className="relative bg-gray-900 text-white">
          {tienda.banner_url
            ? <img src={tienda.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-25" />
            : <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-gray-900" />
          }

          <div className="relative max-w-2xl mx-auto px-4 pt-3 pb-4">
            <Link to="/catalogo" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-xs mb-3 transition-colors">
              <ChevronLeft size={14} /> Catálogo
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {tienda.vendedor.foto_url
                  ? <img src={tienda.vendedor.foto_url} alt={tienda.vendedor.nombre} className="w-full h-full object-cover" />
                  : <Store size={24} className="text-white/60" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-white leading-tight">{tienda.nombre_tienda}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="flex items-center gap-1 text-yellow-400 text-xs">
                    <Star size={11} fill="currentColor" />
                    <span className="font-semibold">{Number(tienda.vendedor.rating_promedio).toFixed(1)}</span>
                  </span>
                  {tienda.vendedor.facultad && (
                    <span className="flex items-center gap-1 text-white/55 text-xs">
                      <MapPin size={11} /> {tienda.vendedor.facultad}
                    </span>
                  )}
                  <span className="text-white/55 text-xs flex items-center gap-1">
                    <Clock size={11} /> {tienda.productos.length} producto{tienda.productos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {tienda.descripcion && (
                  <p className="text-white/60 text-xs mt-1 line-clamp-1">{tienda.descripcion}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Slider de categorías ── */}
        <div
          ref={sliderRef}
          className="flex items-center overflow-x-auto scrollbar-hide border-b border-gray-100 bg-white"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Botón búsqueda */}
          <button
            onClick={() => setMostrarBusqueda(v => !v)}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 border-r border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <Search size={18} className="text-gray-600" />
          </button>

          <div className="flex items-center px-2 min-w-max">
            {categorias.map(cat => (
              <button
                key={cat}
                data-cat={cat}
                onClick={() => scrollToCategoria(cat)}
                className={`relative px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  categoriaActiva === cat
                    ? 'text-green-700'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {cat}
                {categoriaActiva === cat && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-700 rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de búsqueda (se despliega) */}
        {mostrarBusqueda && (
          <div className="px-4 py-2 bg-white border-b border-gray-100">
            <input
              autoFocus
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar en la tienda..."
              className="w-full text-sm px-3 py-2 bg-gray-100 rounded-lg outline-none placeholder-gray-400"
            />
          </div>
        )}
      </div>

      {/* ── Contenido ── */}
      <div className="max-w-2xl mx-auto px-4">

        {/* Resultados de búsqueda */}
        {productosFiltrados !== null ? (
          <div className="py-2">
            <p className="text-xs text-gray-400 py-3">
              {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''} para "{busqueda}"
            </p>
            {productosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Package size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              productosFiltrados.map(p => (
                <TarjetaProducto key={p.id_producto} producto={p} id_tienda={tienda.id_tienda} tienda_nombre={tienda.nombre_tienda} />
              ))
            )}
          </div>
        ) : (
          /* Secciones por categoría */
          grupos.map(({ cat, productos }) => (
            <div
              key={cat}
              ref={el => { sectionRefs.current[cat] = el }}
              data-categoria={cat}
            >
              <h2 className="text-base font-bold text-gray-900 pt-6 pb-1">{cat}</h2>
              {productos.map(p => (
                <TarjetaProducto key={p.id_producto} producto={p} id_tienda={tienda.id_tienda} tienda_nombre={tienda.nombre_tienda} />
              ))}
            </div>
          ))
        )}

        {/* Pie */}
        <div className="flex items-center justify-center gap-2 py-10 text-gray-300 text-xs">
          <ShoppingCart size={14} />
          <span>Marketplace Uniguajira</span>
        </div>
      </div>
    </div>
  )
}
