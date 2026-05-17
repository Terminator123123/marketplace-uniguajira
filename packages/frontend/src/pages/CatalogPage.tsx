import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../lib/api.ts'
import type { Producto } from '@marketplace/shared'

const CATEGORIAS = ['Todos', 'artesanías', 'papelería', 'tecnología', 'alimentos', 'tutorías', 'soporte técnico', 'diseño gráfico']
const LIMIT = 12

export default function CatalogPage() {
  const [searchParams] = useSearchParams()
  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [inputBusqueda, setInputBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState(searchParams.get('categoria') ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce: espera 350ms después de que el usuario deja de escribir
  function handleBusqueda(valor: string) {
    setInputBusqueda(valor)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBusqueda(valor)
      setPage(1)
    }, 350)
  }

  useEffect(() => {
    setLoading(true)
    setError(false)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (busqueda) params.set('busqueda', busqueda)
    if (categoria) params.set('categoria', categoria)

    api.get(`/api/productos?${params}`)
      .then(r => {
        setProductos(r.data.data)
        setTotal(r.data.total)
        setTotalPages(r.data.totalPages ?? 1)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [busqueda, categoria, page])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Catálogo</h1>

      {/* Barra de búsqueda */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={inputBusqueda}
          onChange={e => handleBusqueda(e.target.value)}
          placeholder="Buscar productos..."
          className="input pl-9 w-full"
        />
      </div>

      {/* Chips de categorías — scroll horizontal en móvil */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5 -mx-4 px-4">
        {CATEGORIAS.map(c => {
          const val = c === 'Todos' ? '' : c
          const activo = categoria === val
          return (
            <button key={c}
              onClick={() => { setCategoria(val); setPage(1) }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activo
                  ? 'bg-green-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
              }`}>
              {c}
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-3">No se pudieron cargar los productos</p>
          <button onClick={() => setPage(p => p)} className="btn-primary text-sm">Reintentar</button>
        </div>
      )}

      {/* Skeletons */}
      {loading && !error && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          <p className="text-gray-500 text-sm mb-4">{total} productos encontrados</p>

          {productos.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-500">No encontramos productos con esa búsqueda</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {productos.map(p => (
                <Link key={p.id_producto} to={`/producto/${p.id_producto}`} className="card hover:shadow-md transition-shadow group">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {p.imagenes?.[0] ? (
                      <img
                        src={p.imagenes[0].url}
                        alt={p.nombre}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
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
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
