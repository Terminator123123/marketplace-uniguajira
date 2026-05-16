import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../lib/api.ts'
import { useCartStore } from '../store/cart.ts'
import type { Producto } from '@marketplace/shared'

export default function FavoritosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [quitando, setQuitando] = useState<string | null>(null)
  const agregar = useCartStore(s => s.agregar)

  useEffect(() => {
    api.get('/api/favoritos')
      .then(r => setProductos(r.data.data))
      .finally(() => setLoading(false))
  }, [])

  async function quitar(id: string) {
    setQuitando(id)
    try {
      await api.delete(`/api/favoritos/${id}`)
      setProductos(prev => prev.filter(p => p.id_producto !== id))
    } finally { setQuitando(null) }
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="card animate-pulse h-64" />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Heart size={24} className="text-red-500" fill="currentColor" />
        <h1 className="text-2xl font-bold text-gray-800">Mis favoritos</h1>
        <span className="text-gray-400 text-sm">({productos.length})</span>
      </div>

      {productos.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 mb-4">Aún no tienes productos guardados</p>
          <Link to="/catalogo" className="btn-primary inline-block">Explorar catálogo</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {productos.map(p => (
            <div key={p.id_producto} className="card group">
              <Link to={`/producto/${p.id_producto}`} className="block">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {p.imagenes?.[0]
                    ? <img src={p.imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                </div>
                <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{p.categoria}</span>
                <h3 className="font-medium text-gray-800 mt-1 line-clamp-2 text-sm">{p.nombre}</h3>
                <p className="font-bold text-green-700 mt-1">${Number(p.precio).toLocaleString('es-CO')}</p>
              </Link>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => agregar({ id_producto: p.id_producto, id_tienda: p.id_tienda, nombre: p.nombre, precio: p.precio, tipo: p.tipo, stock: p.stock, imagenes: p.imagenes })}
                  className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1">
                  <ShoppingCart size={14} /> Agregar
                </button>
                <button
                  onClick={() => quitar(p.id_producto)}
                  disabled={quitando === p.id_producto}
                  className="p-1.5 border border-red-200 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  {quitando === p.id_producto ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} fill="currentColor" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
