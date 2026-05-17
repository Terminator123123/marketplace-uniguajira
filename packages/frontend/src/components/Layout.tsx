import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, LogOut, LayoutDashboard, ShoppingCart, Heart, User, BookOpen, Home } from 'lucide-react'
import { useAuthStore } from '../store/auth.ts'
import { useCartStore } from '../store/cart.ts'
import CartDrawer from './CartDrawer.tsx'

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const { totalItems, setOpen } = useCartStore()
  const navigate = useNavigate()
  const location = useLocation()
  const cantItems = totalItems()

  function handleLogout() {
    logout()
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — simplificado en móvil */}
      <header className="bg-green-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <ShoppingBag size={22} />
            <span className="hidden xs:inline">Marketplace <span className="text-orange-300">Uniguajira</span></span>
            <span className="xs:hidden text-orange-300">MKT</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/catalogo" className="hover:text-orange-300 transition-colors text-sm">Catálogo</Link>

            <button onClick={() => setOpen(true)} className="relative hover:text-orange-300 transition-colors">
              <ShoppingCart size={20} />
              {cantItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cantItems > 99 ? '99+' : cantItems}
                </span>
              )}
            </button>

            {usuario ? (
              <>
                {(usuario.rol === 'vendedor' || usuario.rol === 'admin') && (
                  <Link to="/dashboard" className="flex items-center gap-1 hover:text-orange-300 transition-colors text-sm">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                )}
                <Link to="/favoritos" className="hover:text-orange-300 transition-colors" title="Favoritos">
                  <Heart size={18} />
                </Link>
                <Link to="/perfil" className="flex items-center gap-1 hover:text-orange-300 transition-colors text-sm">
                  <User size={15} />
                  <span>{usuario.nombre.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="hover:text-orange-300 transition-colors" title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-orange-300 transition-colors text-sm">Ingresar</Link>
                <Link to="/register" className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium transition-colors">
                  Registrarse
                </Link>
              </>
            )}
          </nav>

          {/* Mobile: solo carrito + login/perfil */}
          <div className="flex md:hidden items-center gap-3">
            <button onClick={() => setOpen(true)} className="relative hover:text-orange-300 transition-colors">
              <ShoppingCart size={22} />
              {cantItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cantItems > 99 ? '99+' : cantItems}
                </span>
              )}
            </button>
            {!usuario && (
              <Link to="/login" className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">
                Ingresar
              </Link>
            )}
            {usuario && (
              <Link to="/perfil" className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                {usuario.nombre.charAt(0).toUpperCase()}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      <CartDrawer />

      {/* Bottom nav — solo móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200 safe-area-bottom">
        <div className="grid grid-cols-5 h-14">
          <Link to="/"
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              location.pathname === '/' ? 'text-green-700' : 'text-gray-400'
            }`}>
            <Home size={20} />
            Inicio
          </Link>

          <Link to="/catalogo"
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isActive('/catalogo') || isActive('/producto') ? 'text-green-700' : 'text-gray-400'
            }`}>
            <BookOpen size={20} />
            Catálogo
          </Link>

          {/* Carrito — botón central destacado */}
          <button onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 relative">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg -mt-4 transition-colors ${
              cantItems > 0 ? 'bg-green-700' : 'bg-gray-800'
            }`}>
              <ShoppingCart size={22} className="text-white" />
              {cantItems > 0 && (
                <span className="absolute top-0 right-3 bg-orange-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {cantItems > 9 ? '9+' : cantItems}
                </span>
              )}
            </div>
          </button>

          <Link to="/mis-pedidos"
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isActive('/mis-pedidos') || isActive('/mis-ordenes') ? 'text-green-700' : 'text-gray-400'
            }`}>
            <Heart size={20} />
            Pedidos
          </Link>

          <Link to={usuario ? '/perfil' : '/login'}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isActive('/perfil') || isActive('/login') || isActive('/register') ? 'text-green-700' : 'text-gray-400'
            }`}>
            <User size={20} />
            {usuario ? usuario.nombre.split(' ')[0] : 'Cuenta'}
          </Link>
        </div>
      </nav>

      <footer className="hidden md:block bg-gray-800 text-gray-400 text-center py-4 text-sm space-y-1">
        <p>© 2026 Marketplace Uniguajira — Universidad de La Guajira</p>
        <div className="flex justify-center gap-4 text-xs">
          <Link to="/legal" className="hover:text-white transition-colors">Términos y Condiciones</Link>
          <Link to="/legal?tab=privacidad" className="hover:text-white transition-colors">Privacidad</Link>
          <Link to="/legal?tab=devoluciones" className="hover:text-white transition-colors">Devoluciones</Link>
          <a href="mailto:marketplace@uniguajira.edu.co" className="hover:text-white transition-colors">Contacto</a>
        </div>
      </footer>
    </div>
  )
}
