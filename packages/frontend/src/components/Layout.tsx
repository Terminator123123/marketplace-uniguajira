import { Outlet, Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, LogOut, LayoutDashboard, ShoppingCart, Heart, User } from 'lucide-react'
import { useAuthStore } from '../store/auth.ts'
import { useCartStore } from '../store/cart.ts'
import CartDrawer from './CartDrawer.tsx'

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const { totalItems, setOpen } = useCartStore()
  const navigate = useNavigate()
  const cantItems = totalItems()

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

            {/* Ícono carrito */}
            <button onClick={() => setOpen(true)} className="relative hover:text-orange-300 transition-colors">
              <ShoppingCart size={22} />
              {cantItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cantItems > 99 ? '99+' : cantItems}
                </span>
              )}
            </button>

            {usuario ? (
              <>
                {(usuario.rol === 'vendedor' || usuario.rol === 'admin') && (
                  <Link to="/dashboard" className="flex items-center gap-1 hover:text-orange-300 transition-colors">
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                )}
                <Link to="/favoritos" className="hover:text-orange-300 transition-colors" title="Mis favoritos">
                  <Heart size={18} />
                </Link>
                <Link to="/perfil" className="flex items-center gap-1 hover:text-orange-300 transition-colors text-sm">
                  <User size={16} />
                  <span className="hidden sm:block">{usuario.nombre.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1 hover:text-orange-300 transition-colors" title="Cerrar sesión">
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

      <CartDrawer />

      <footer className="bg-gray-800 text-gray-400 text-center py-4 text-sm">
        © 2026 Marketplace Uniguajira — Universidad de La Guajira
      </footer>
    </div>
  )
}
