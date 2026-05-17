import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cart.ts'

export default function CartDrawer() {
  const { items, open, setOpen, quitar, actualizarCantidad, total, totalItems } = useCartStore()

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-green-700" />
            <h2 className="font-semibold text-gray-800">Carrito ({totalItems()})</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-sm">Tu carrito está vacío</p>
              <button onClick={() => setOpen(false)} className="text-green-700 text-sm underline">
                Ver catálogo
              </button>
            </div>
          ) : (
            items.map(({ producto, cantidad }) => (
              <div key={producto.id_producto} className="flex gap-3">
                {/* Imagen */}
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {producto.imagenes?.[0] ? (
                    <img src={producto.imagenes[0].url} alt={producto.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{producto.nombre}</p>
                  <p className="text-green-700 font-semibold text-sm mt-0.5">
                    ${Number(producto.precio).toLocaleString('es-CO')} c/u
                  </p>

                  {/* Cantidad — touch targets 44px */}
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={() => actualizarCantidad(producto.id_producto, cantidad - 1)}
                      className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm w-8 text-center font-semibold">{cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(producto.id_producto, cantidad + 1)}
                      disabled={producto.tipo === 'fisico' && producto.stock !== undefined && cantidad >= producto.stock}
                      className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => quitar(producto.id_producto)}
                      className="ml-auto w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 active:text-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-3">
            <div className="flex justify-between text-gray-800">
              <span className="font-medium">Total</span>
              <span className="font-bold text-lg">${total().toLocaleString('es-CO')} COP</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="btn-primary w-full text-center block"
            >
              Proceder al pago
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
