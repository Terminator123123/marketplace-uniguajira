import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Star, Shield, Zap, ArrowRight } from 'lucide-react'
import api from '../lib/api.ts'
import { useAuthStore } from '../store/auth.ts'
import type { Producto } from '@marketplace/shared'

const CATEGORIAS_RAPIDAS = [
  { label: 'Artesanías', emoji: '🎨', cat: 'artesanías' },
  { label: 'Tecnología', emoji: '💻', cat: 'tecnología' },
  { label: 'Alimentos',  emoji: '🍕', cat: 'alimentos'  },
  { label: 'Papelería',  emoji: '📚', cat: 'papelería'  },
  { label: 'Tutorías',   emoji: '🎓', cat: 'tutorías'   },
  { label: 'Diseño',     emoji: '✏️', cat: 'diseño gráfico' },
]

export default function HomePage() {
  const usuario = useAuthStore(s => s.usuario)
  const esVendedor = usuario?.rol === 'vendedor' || usuario?.rol === 'admin'
  const ctaTiendaHref = usuario ? '/dashboard' : '/register'
  const ctaTiendaLabel = esVendedor ? 'Ir a mi tienda' : usuario ? 'Ir al dashboard' : 'Crear tienda'

  const [productos, setProductos] = useState<Producto[]>([])
  const [loadingP, setLoadingP] = useState(true)

  useEffect(() => {
    api.get('/api/productos?limit=8&page=1')
      .then(r => setProductos(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingP(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Emprendimiento universitario,<br />
            <span className="text-orange-300">un solo lugar</span>
          </h1>
          <p className="text-green-100 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            Compra y vende productos y servicios de estudiantes y egresados de la Universidad de La Guajira.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Ver catálogo
            </Link>
            <Link to={ctaTiendaHref} className="border border-white hover:bg-white hover:text-green-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              {ctaTiendaLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías rápidas */}
      <section className="py-6 px-4 max-w-6xl mx-auto">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {CATEGORIAS_RAPIDAS.map(c => (
            <Link key={c.cat}
              to={`/catalogo?categoria=${encodeURIComponent(c.cat)}`}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-white border border-gray-200 hover:border-green-400 hover:shadow-sm rounded-xl px-4 py-3 transition-all">
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      <section className="py-4 px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">Productos destacados</h2>
          <Link to="/catalogo" className="text-sm text-green-700 font-medium flex items-center gap-1 hover:underline">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {loadingP ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : productos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {productos.map(p => (
              <Link key={p.id_producto} to={`/producto/${p.id_producto}`}
                className="card hover:shadow-md transition-shadow group">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {p.imagenes?.[0] ? (
                    <img src={p.imagenes[0].url} alt={p.nombre} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
                  )}
                </div>
                <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{p.categoria}</span>
                <h3 className="font-medium text-gray-800 mt-1 text-sm line-clamp-2">{p.nombre}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-green-700 text-sm">${Number(p.precio).toLocaleString('es-CO')}</span>
                  <div className="flex items-center gap-0.5 text-yellow-500">
                    <Star size={11} fill="currentColor" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* Features */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-8 text-gray-800">¿Por qué Marketplace Uniguajira?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'Validado institucionalmente', desc: 'Solo vendedores con correo @uniguajira.edu.co pueden crear tiendas.' },
            { icon: Star,   title: 'Sistema de reputación',       desc: 'Compra con confianza. Cada vendedor tiene calificaciones reales.' },
            { icon: Zap,    title: 'Pagos locales',               desc: 'Nequi, Daviplata y PSE. Paga como quieras, rápido y seguro.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Icon size={24} className="text-green-700" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — solo si no está logueado */}
      {!usuario && (
        <section className="bg-orange-50 py-14 px-4 text-center">
          <ShoppingBag size={48} className="mx-auto text-orange-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-3">¿Tienes un emprendimiento?</h2>
          <p className="text-gray-600 mb-6">Regístrate con tu correo institucional y empieza a vender hoy.</p>
          <Link to="/register" className="btn-primary inline-block">Crear mi tienda gratis</Link>
        </section>
      )}
    </div>
  )
}
