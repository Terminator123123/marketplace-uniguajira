import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Store, Star, MapPin, ShoppingCart, Check } from 'lucide-react'
import axios from 'axios'
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

function TarjetaProducto({ producto, id_tienda, tienda_nombre }: { producto: ProductoResumen; id_tienda: string; tienda_nombre: string }) {
  const [agregado, setAgregado] = useState(false)
  const agregar = useCartStore(s => s.agregar)
  const sinStock = producto.tipo === 'fisico' && producto.stock !== null && producto.stock <= 0

  function handleAgregar(e: React.MouseEvent) {
    e.preventDefault()
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

  const imagen = producto.imagenes[0]?.url

  return (
    <Link to={`/producto/${producto.id_producto}`} className="card group hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
        {imagen
          ? <img src={imagen} alt={producto.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        }
      </div>
      <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{producto.categoria}</span>
      <h3 className="font-semibold text-gray-800 mt-1 mb-1 line-clamp-2">{producto.nombre}</h3>
      <p className="text-green-700 font-bold mb-3">${Number(producto.precio).toLocaleString('es-CO')} COP</p>
      {sinStock && <p className="text-xs text-red-500 mb-2">Sin stock</p>}
      <button
        onClick={handleAgregar}
        disabled={sinStock}
        className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-all ${
          agregado
            ? 'bg-green-500 text-white'
            : sinStock
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'btn-primary'
        }`}
      >
        {agregado ? <><Check size={15} /> Agregado</> : <><ShoppingCart size={15} /> Agregar</>}
      </button>
    </Link>
  )
}

export default function TiendaPage() {
  const { id } = useParams<{ id: string }>()
  const [tienda, setTienda] = useState<Tienda | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    axios.get(`/api/tiendas/${id}`)
      .then(r => setTienda(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-48 bg-gray-100 rounded-xl" />
      <div className="h-6 w-48 bg-gray-100 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl" />)}
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="h-48 rounded-xl overflow-hidden bg-gradient-to-r from-green-700 to-green-500 mb-6 relative">
        {tienda.banner_url
          ? <img src={tienda.banner_url} alt="Banner" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Store size={64} className="text-white/40" />
            </div>
        }
      </div>

      {/* Info de la tienda */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {tienda.vendedor.foto_url
            ? <img src={tienda.vendedor.foto_url} alt={tienda.vendedor.nombre} className="w-full h-full object-cover" />
            : <Store size={28} className="text-green-700" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-800">{tienda.nombre_tienda}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500" fill="currentColor" />
              {Number(tienda.vendedor.rating_promedio).toFixed(1)}
            </span>
            {tienda.vendedor.facultad && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {tienda.vendedor.facultad}
              </span>
            )}
            <span>{tienda.productos.length} producto{tienda.productos.length !== 1 ? 's' : ''}</span>
          </div>
          {tienda.descripcion && (
            <p className="text-gray-600 text-sm mt-2">{tienda.descripcion}</p>
          )}
        </div>
      </div>

      {/* Productos */}
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos disponibles</h2>

      {tienda.productos.length === 0
        ? <div className="text-center py-16 text-gray-400">
            <p>Esta tienda aún no tiene productos publicados.</p>
          </div>
        : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tienda.productos.map(p => <TarjetaProducto key={p.id_producto} producto={p} id_tienda={tienda.id_tienda} tienda_nombre={tienda.nombre_tienda} />)}
          </div>
      }
    </div>
  )
}
