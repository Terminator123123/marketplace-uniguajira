import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Store, Star, MapPin, ShoppingCart, Check, ChevronLeft, Package } from 'lucide-react'
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
    <Link to={`/producto/${producto.id_producto}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Imagen */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        {imagen
          ? <img src={imagen} alt={producto.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-50">📦</div>
        }
        {sinStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Sin stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 flex-1 leading-snug">{producto.nombre}</h3>
        <p className="text-green-700 font-bold text-base mt-1">${Number(producto.precio).toLocaleString('es-CO')}</p>

        <button
          onClick={handleAgregar}
          disabled={sinStock}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-xl transition-all ${
            agregado
              ? 'bg-green-500 text-white'
              : sinStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-700 hover:bg-green-800 text-white active:scale-95'
          }`}
        >
          {agregado
            ? <><Check size={14} /> Agregado</>
            : <><ShoppingCart size={14} /> Agregar</>
          }
        </button>
      </div>
    </Link>
  )
}

export default function TiendaPage() {
  const { id } = useParams<{ id: string }>()
  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos')
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get(`/api/tiendas/${id}`)
      .then(r => setTienda(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-20 bg-gray-200 rounded-full" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-gray-200 rounded-2xl" />)}
        </div>
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

  const categorias = ['Todos', ...Array.from(new Set(tienda.productos.map(p => p.categoria)))]
  const productosFiltrados = categoriaActiva === 'Todos'
    ? tienda.productos
    : tienda.productos.filter(p => p.categoria === categoriaActiva)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header oscuro con banner ── */}
      <div className="relative bg-gray-900 text-white">
        {/* Banner de fondo */}
        {tienda.banner_url
          ? <img src={tienda.banner_url} alt="Banner" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          : <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-gray-900" />
        }

        {/* Contenido del header */}
        <div className="relative max-w-5xl mx-auto px-4 pt-4 pb-6">
          {/* Botón volver */}
          <Link to="/catalogo" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ChevronLeft size={16} /> Catálogo
          </Link>

          <div className="flex items-center gap-4">
            {/* Avatar tienda */}
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {tienda.vendedor.foto_url
                ? <img src={tienda.vendedor.foto_url} alt={tienda.vendedor.nombre} className="w-full h-full object-cover" />
                : <Store size={28} className="text-white/60" />
              }
            </div>

            {/* Nombre e info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight">{tienda.nombre_tienda}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-yellow-400 text-sm">
                  <Star size={13} fill="currentColor" />
                  <span className="font-semibold">{Number(tienda.vendedor.rating_promedio).toFixed(1)}</span>
                </span>
                {tienda.vendedor.facultad && (
                  <span className="flex items-center gap-1 text-white/60 text-xs">
                    <MapPin size={12} /> {tienda.vendedor.facultad}
                  </span>
                )}
                <span className="text-white/60 text-xs">
                  <Package size={12} className="inline mr-1" />
                  {tienda.productos.length} producto{tienda.productos.length !== 1 ? 's' : ''}
                </span>
              </div>
              {tienda.descripcion && (
                <p className="text-white/70 text-xs mt-1.5 line-clamp-2">{tienda.descripcion}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs de categorías ── */}
        <div ref={tabsRef} className="relative border-t border-white/10 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 py-2 max-w-5xl mx-auto min-w-max">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  categoriaActiva === cat
                    ? 'bg-white text-gray-900'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de productos ── */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay productos en esta categoría.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
              {categoriaActiva !== 'Todos' && ` en "${categoriaActiva}"`}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {productosFiltrados.map(p => (
                <TarjetaProducto key={p.id_producto} producto={p} id_tienda={tienda.id_tienda} tienda_nombre={tienda.nombre_tienda} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
