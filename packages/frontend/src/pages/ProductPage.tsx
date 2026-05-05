import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingCart, Star, Store, ChevronLeft, ChevronRight } from 'lucide-react'
import axios from 'axios'
import type { Producto } from '@marketplace/shared'

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/productos/${id}`)
      .then(r => setProducto(r.data.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse"><div className="h-64 bg-gray-100 rounded-xl" /></div>
  if (!producto) return <div className="text-center py-20 text-gray-500">Producto no encontrado</div>

  const imagenes = producto.imagenes ?? []

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

          {producto.vendedor && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
              <Star size={14} className="text-yellow-500" fill="currentColor" />
              <span>{Number(producto.vendedor.rating_promedio).toFixed(1)}</span>
              <span>·</span>
              <Store size={14} />
              <span>{producto.tienda?.nombre_tienda}</span>
            </div>
          )}

          <p className="text-3xl font-bold text-green-700 mb-4">${Number(producto.precio).toLocaleString('es-CO')} COP</p>

          {producto.descripcion && <p className="text-gray-600 mb-4">{producto.descripcion}</p>}

          {producto.tipo === 'fisico' && producto.stock !== undefined && (
            <p className="text-sm text-gray-500 mb-4">
              {producto.stock > 0 ? `${producto.stock} disponibles` : <span className="text-red-500">Sin stock</span>}
            </p>
          )}

          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <ShoppingCart size={18} />
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
