import { Link } from 'react-router-dom'
import { Home, ShoppingBag } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl mb-6">🛒</p>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Página no encontrada</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        La página que buscas no existe o fue movida.
      </p>
      <div className="flex gap-3">
        <Link to="/" className="btn-primary flex items-center gap-2">
          <Home size={16} /> Ir al inicio
        </Link>
        <Link to="/catalogo" className="btn-secondary flex items-center gap-2">
          <ShoppingBag size={16} /> Ver catálogo
        </Link>
      </div>
    </div>
  )
}
