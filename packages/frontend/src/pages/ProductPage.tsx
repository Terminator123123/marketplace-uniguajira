import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingCart, Star, Store, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import type { Producto } from '@marketplace/shared'
import { useCartStore } from '../store/cart.ts'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [agregado, setAgregado] = useState(false)
  const agregar = useCartStore(s => s.agregar)

  useEffect(() => {
    axios.get(`/api/productos/${id}`)
      .then(r => setProducto(r.data.data))
      .finally(() => setLoading(false))
  }, [id])

  function handleAgregar() {
    if (!producto) return
    agregar({
      id_producto: producto.id_producto,
      id_tienda: producto.id_tienda,
      nombre: producto.nombre,
      precio: producto.precio,
      tipo: producto.tipo,
      stock: producto.stock,
      imagenes: producto.imagenes,
      tienda_nombre: producto.tienda?.nombre_tienda,
    })
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse"><div className="h-64 bg-gray-100 rounded-xl" /></div>
  if (!producto) return <div className="text-center py-20 text-gray-500">Producto no encontrado</div>

  const imagenes = producto.imagenes ?? []
  const sinStock = producto.tipo === 'fisico' && producto.stock !== undefined && producto.stock <= 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Galería */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
            {imagenes[imgIdx] ? (
              <img src={imagenes[imgIdx].url} alt={producto.nombre} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>}
            {imagenes.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + imagenes.length) % imagenes.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1"><ChevronLeft size={20} /></button>
                <button onClick={() => setImgIdx(i => (i + 1) % imagenes.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1"><ChevronRight size={20} /></button>
              </>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2 mt-2">
              {imagenes.map((img, i) => (
                <button key={img.id_imagen} onClick={() => setImgIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === imgIdx ? 'border-green-600' : 'border-transparent'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{producto.categoria}</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2 mb-1">{producto.nombre}</h1>

          {producto.tienda && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
              <Store size={14} />
              <Link to={`/tienda/${producto.tienda.id_tienda}`} className="hover:text-green-700 hover:underline">
                {producto.tienda.nombre_tienda}
              </Link>
              {producto.vendedor && (
                <>
                  <span>·</span>
                  <Star size={14} className="text-yellow-500" fill="currentColor" />
                  <span>{Number(producto.vendedor.rating_promedio).toFixed(1)}</span>
                </>
              )}
            </div>
          )}

          <p className="text-3xl font-bold text-green-700 mb-4">${Number(producto.precio).toLocaleString('es-CO')} COP</p>

          {producto.descripcion && <p className="text-gray-600 mb-4">{producto.descripcion}</p>}

          {producto.tipo === 'fisico' && producto.stock !== undefined && (
            <p className="text-sm text-gray-500 mb-4">
              {producto.stock > 0 ? `${producto.stock} disponibles` : <span className="text-red-500">Sin stock</span>}
            </p>
          )}

          <button
            onClick={handleAgregar}
            disabled={sinStock}
            className={`w-full flex items-center justify-center gap-2 font-medium px-4 py-3 rounded-lg transition-all ${
              agregado
                ? 'bg-green-500 text-white'
                : sinStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {agregado ? <><Check size={18} /> Agregado</> : <><ShoppingCart size={18} /> Agregar al carrito</>}
          </button>
        </div>
      </div>
    </div>
  )
}
