import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Star } from 'lucide-react'
import axios from 'axios'
import type { Producto } from '@marketplace/shared'

const CATEGORIAS = ['Todos', 'artesanías', 'papelería', 'tecnología', 'alimentos', 'tutorías', 'soporte técnico', 'diseño gráfico']

export default function CatalogPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '12' })
    if (busqueda) params.set('busqueda', busqueda)
    if (categoria) params.set('categoria', categoria)

    axios.get(`/api/productos?${params}`)
      .then(r => { setProductos(r.data.data); setTotal(r.data.total) })
      .finally(() => setLoading(false))
  }, [busqueda, categoria, page])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Catálogo</h1>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPage(1) }}
            placeholder="Buscar productos..."
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-gray-500" />
          <select value={categoria} onChange={e => { setCategoria(e.target.value === 'Todos' ? '' : e.target.value); setPage(1) }} className="input w-auto">
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-64 bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">{total} productos encontrados</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productos.map(p => (
              <Link key={p.id_producto} to={`/producto/${p.id_producto}`} className="card hover:shadow-md transition-shadow group">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {p.imagenes?.[0] ? (
                    <img src={p.imagenes[0].url} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
                  )}
                </div>
                <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{p.categoria}</span>
                <h3 className="font-medium text-gray-800 mt-1 line-clamp-2">{p.nombre}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-green-700">${Number(p.precio).toLocaleString('es-CO')}</span>
                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                    <Star size={12} fill="currentColor" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
