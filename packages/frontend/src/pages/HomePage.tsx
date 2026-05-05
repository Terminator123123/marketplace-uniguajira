import { Link } from 'react-router-dom'
import { ShoppingBag, Star, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Emprendimiento universitario,<br />
            <span className="text-orange-300">un solo lugar</span>
          </h1>
          <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
            Compra y vende productos y servicios de estudiantes y egresados de la Universidad de La Guajira.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Ver catálogo
            </Link>
            <Link to="/register" className="border border-white hover:bg-white hover:text-green-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
              Crear tienda
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12 text-gray-800">¿Por qué Marketplace Uniguajira?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'Validado institucionalmente', desc: 'Solo vendedores con correo @uniguajira.edu.co pueden crear tiendas.' },
            { icon: Star, title: 'Sistema de reputación', desc: 'Compra con confianza. Cada vendedor tiene calificaciones reales.' },
            { icon: Zap, title: 'Pagos locales', desc: 'Nequi, Daviplata y PSE. Paga como quieras, rápido y seguro.' },
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

      {/* CTA */}
      <section className="bg-orange-50 py-16 px-4 text-center">
        <ShoppingBag size={48} className="mx-auto text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-3">¿Tienes un emprendimiento?</h2>
        <p className="text-gray-600 mb-6">Regístrate con tu correo institucional y empieza a vender hoy.</p>
        <Link to="/register" className="btn-primary inline-block">Crear mi tienda gratis</Link>
      </section>
    </div>
  )
}
