import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Star, Store, ChevronLeft, ChevronRight, Check, Minus, Plus, User } from 'lucide-react'
import api from '../lib/api.ts'
import type { Producto } from '@marketplace/shared'
import { useCartStore } from '../store/cart.ts'

interface Resena {
  id_resena: string
  calificacion: number
  comentario?: string
  created_at: string
  comprador?: { nombre: string; foto_url?: string }
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [imgIdx, setImgIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [agregado, setAgregado] = useState(false)
  const [cantidad, setCantidad] = useState(1)
  const [resenas, setResenas] = useState<Resena[]>([])
  const agregar = useCartStore(s => s.agregar)

  useEffect(() => {
    api.get(`/api/productos/${id}`)
      .then(r => setProducto(r.data.data))
      .finally(() => setLoading(false))
    api.get(`/api/resenas/producto/${id}`)
      .then(r => setResenas(r.data.data ?? []))
      .catch(() => {})
  }, [id])

  function handleAgregar() {
    if (!producto) return
    for (let i = 0; i < cantidad; i++) {
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
    }
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-72 bg-gray-100 rounded-xl" />
      <div className="h-6 bg-gray-100 rounded w-2/3" />
      <div className="h-8 bg-gray-100 rounded w-1/3" />
    </div>
  )
  if (!producto) return <div className="text-center py-20 text-gray-500">Producto no encontrado</div>

  const imagenes = producto.imagenes ?? []
  const sinStock = producto.tipo === 'fisico' && producto.stock !== undefined && producto.stock <= 0
  const maxCantidad = producto.tipo === 'fisico' && producto.stock ? producto.stock : 99
  const ratingPromedio = resenas.length > 0
    ? resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length
    : Number(producto.vendedor?.rating_promedio ?? 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 md:pb-8">
      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        {/* Galería */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
            {imagenes[imgIdx] ? (
              <img src={imagenes[imgIdx].url} alt={producto.nombre} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>}
            {imagenes.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx(i => (i - 1 + imagenes.length) % imagenes.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setImgIdx(i => (i + 1) % imagenes.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full w-10 h-10 flex items-center justify-center shadow-md">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imagenes.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
          {imagenes.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
              {imagenes.map((img, i) => (
                <button key={img.id_imagen} onClick={() => setImgIdx(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
                    i === imgIdx ? 'border-green-600' : 'border-transparent'
                  }`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{producto.categoria}</span>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mt-2">{producto.nombre}</h1>

            {/* Rating */}
            {(resenas.length > 0 || ratingPromedio > 0) && (
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14}
                    className={s <= Math.round(ratingPromedio) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                ))}
                <span className="text-xs text-gray-500 ml-1">{ratingPromedio.toFixed(1)}</span>
                {resenas.length > 0 && <span className="text-xs text-gray-400">({resenas.length} reseñas)</span>}
              </div>
            )}
          </div>

          {producto.tienda && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Store size={14} />
              <Link to={`/tienda/${producto.tienda.id_tienda}`} className="hover:text-green-700 hover:underline">
                {producto.tienda.nombre_tienda}
              </Link>
            </div>
          )}

          <p className="text-3xl font-bold text-green-700">${Number(producto.precio).toLocaleString('es-CO')} <span className="text-sm font-normal text-gray-400">COP</span></p>

          {producto.descripcion && (
            <p className="text-gray-600 text-sm leading-relaxed">{producto.descripcion}</p>
          )}

          {producto.tipo === 'fisico' && producto.stock !== undefined && (
            <p className={`text-sm font-medium ${producto.stock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
              {producto.stock > 0 ? `${producto.stock} disponibles` : 'Sin stock'}
            </p>
          )}

          {/* Selector de cantidad */}
          {!sinStock && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Cantidad:</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors">
                  <Minus size={15} />
                </button>
                <span className="w-10 text-center font-semibold text-gray-800">{cantidad}</span>
                <button onClick={() => setCantidad(c => Math.min(maxCantidad, c + 1))}
                  className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors">
                  <Plus size={15} />
                </button>
              </div>
              <span className="text-xs text-gray-400">
                = ${(Number(producto.precio) * cantidad).toLocaleString('es-CO')} COP
              </span>
            </div>
          )}

          {/* CTA — visible en desktop; en móvil está sticky en el bottom */}
          <button
            onClick={handleAgregar}
            disabled={sinStock}
            className={`hidden md:flex w-full items-center justify-center gap-2 font-medium px-4 py-3 rounded-xl transition-all text-base ${
              agregado ? 'bg-green-500 text-white' : sinStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'btn-primary'
            }`}
          >
            {agregado ? <><Check size={18} /> Agregado al carrito</> : <><ShoppingCart size={18} /> Agregar al carrito</>}
          </button>
        </div>
      </div>

      {/* Reseñas */}
      {resenas.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-gray-800 mb-4">Reseñas ({resenas.length})</h2>
          <div className="space-y-3">
            {resenas.map(r => (
              <div key={r.id_resena} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    {r.comprador?.foto_url
                      ? <img src={r.comprador.foto_url} className="w-full h-full rounded-full object-cover" alt="" />
                      : <User size={14} className="text-green-600" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{r.comprador?.nombre ?? 'Usuario'}</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11}
                          className={s <= r.calificacion ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(r.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {r.comentario && <p className="text-sm text-gray-600">{r.comentario}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky CTA — solo móvil */}
      <div className="fixed bottom-14 left-0 right-0 md:hidden bg-white border-t border-gray-200 px-4 py-3 z-20">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-1">
            <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center active:bg-gray-100">
              <Minus size={15} />
            </button>
            <span className="w-8 text-center font-bold">{cantidad}</span>
            <button onClick={() => setCantidad(c => Math.min(maxCantidad, c + 1))}
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center active:bg-gray-100">
              <Plus size={15} />
            </button>
          </div>
          <button
            onClick={handleAgregar}
            disabled={sinStock}
            className={`flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-xl transition-all ${
              agregado ? 'bg-green-500 text-white' : sinStock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'btn-primary'
            }`}
          >
            {agregado ? <><Check size={18} /> Agregado</> : <><ShoppingCart size={18} /> Agregar · ${(Number(producto.precio) * cantidad).toLocaleString('es-CO')}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
