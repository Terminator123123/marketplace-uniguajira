import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ChevronRight, Package, CheckCircle, Truck, Clock, Ban, RefreshCw } from 'lucide-react'
import api from '../lib/api.ts'
import type { Orden, OrdenEstado } from '@marketplace/shared'

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pendiente:  { label: 'Pendiente',   color: 'text-yellow-700', bg: 'bg-yellow-50',  icon: Clock      },
  pagada:     { label: 'Pagada',      color: 'text-blue-700',   bg: 'bg-blue-50',    icon: RefreshCw  },
  en_entrega: { label: 'En entrega',  color: 'text-indigo-700', bg: 'bg-indigo-50',  icon: Truck      },
  completada: { label: 'Completada',  color: 'text-green-700',  bg: 'bg-green-50',   icon: CheckCircle },
  cancelada:  { label: 'Cancelada',   color: 'text-red-600',    bg: 'bg-red-50',     icon: Ban        },
}

export default function MisPedidosPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<OrdenEstado | 'todos'>('todos')
  const [cancelando, setCancelando] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/ordenes/mis-ordenes')
      .then(r => setOrdenes(r.data.data))
      .finally(() => setLoading(false))
  }, [])

  async function cancelar(id: string) {
    setCancelando(id)
    try {
      await api.patch(`/api/ordenes/${id}/estado`, { estado: 'cancelada' })
      setOrdenes(prev => prev.map(o => o.id_orden === id ? { ...o, estado: 'cancelada' as OrdenEstado } : o))
    } catch { /* silencioso */ }
    finally { setCancelando(null) }
  }

  const FILTROS: { key: OrdenEstado | 'todos'; label: string }[] = [
    { key: 'todos',      label: 'Todos' },
    { key: 'pendiente',  label: 'Pendiente' },
    { key: 'pagada',     label: 'Pagada' },
    { key: 'en_entrega', label: 'En entrega' },
    { key: 'completada', label: 'Completada' },
    { key: 'cancelada',  label: 'Cancelada' },
  ]

  const lista = filtro === 'todos' ? ordenes : ordenes.filter(o => o.estado === filtro)

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Mis pedidos</h1>
        <p className="text-sm text-gray-500">{ordenes.length} pedido{ordenes.length !== 1 ? 's' : ''} en total</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-5">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtro === f.key
                ? 'bg-green-700 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            {filtro === 'todos' ? 'Aún no tienes pedidos' : 'No hay pedidos en esta categoría'}
          </p>
          {filtro === 'todos' && (
            <Link to="/catalogo" className="text-sm text-green-700 font-medium hover:underline">
              Explorar productos
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(orden => {
            const est = ESTADO_CONFIG[orden.estado]
            const EstIcon = est.icon
            const items = orden.items ?? []
            const resumen = items.slice(0, 2).map(i => `${i.cantidad}x ${i.producto?.nombre ?? '…'}`).join(', ')
            const extra = items.length > 2 ? ` +${items.length - 2} más` : ''
            const fechaCorta = new Date(orden.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
            const puedeCancelar = orden.estado === 'pendiente'

            return (
              <div key={orden.id_orden} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
                  <span className="text-xs font-mono text-gray-400">#{orden.id_orden.slice(-6).toUpperCase()}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${est.color} ${est.bg}`}>
                    <EstIcon size={10} /> {est.label}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">{fechaCorta}</span>
                </div>

                {/* Imagen del primer producto */}
                <div className="px-4 py-3 flex items-center gap-3">
                  {items[0]?.producto?.imagenes?.[0]?.url ? (
                    <img
                      src={items[0].producto.imagenes[0].url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{resumen}{extra}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{orden.metodo_pago}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-800">
                      ${Number(orden.total).toLocaleString('es-CO')}
                    </span>
                    <Link to={`/mis-ordenes/${orden.id_orden}`}
                      className="text-xs text-green-700 font-medium flex items-center gap-0.5 hover:underline">
                      Ver detalle <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Acción cancelar */}
                {puedeCancelar && (
                  <div className="px-4 py-2 border-t border-gray-50 flex justify-end">
                    <button
                      onClick={() => cancelar(orden.id_orden)}
                      disabled={cancelando === orden.id_orden}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50">
                      <Ban size={11} />
                      {cancelando === orden.id_orden ? 'Cancelando...' : 'Cancelar pedido'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
