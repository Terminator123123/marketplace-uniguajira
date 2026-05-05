import { Outlet, Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../store/auth.ts'

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <ShoppingBag size={24} />
            <span>Marketplace <span className="text-orange-300">Uniguajira</span></span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link to="/catalogo" className="hover:text-orange-300 transition-colors">
              Catálogo
            </Link>
            {usuario ? (
              <>
                {usuario.rol === 'vendedor' && (
                  <Link to="/dashboard" className="flex items-center gap-1 hover:text-orange-300 transition-colors">
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                )}
                <span className="text-green-200 text-sm">{usuario.nombre}</span>
                <button onClick={handleLogout} className="flex items-center gap-1 hover:text-orange-300 transition-colors">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-orange-300 transition-colors">Ingresar</Link>
                <Link to="/register" className="btn-secondary text-sm py-1.5">Registrarse</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-gray-400 text-center py-4 text-sm">
        © 2026 Marketplace Uniguajira — Universidad de La Guajira
      </footer>
    </div>
  )
}
