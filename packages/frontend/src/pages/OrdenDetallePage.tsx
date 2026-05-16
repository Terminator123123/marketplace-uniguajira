import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, Loader2, Package, MessageCircle } from 'lucide-react'
import api from '../lib/api.ts'
import { connectSocket } from '../lib/socket.ts'
import { useAuthStore } from '../store/auth.ts'

interface ItemOrden {
  id_item: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  producto: { id_producto: string; nombre: string; precio: number; id_vendedor: string; imagenes?: { url: string }[] }
}

interface Orden {
  id_orden: string
  total: number
  estado: string
  metodo_pago: string
  created_at: string
  id_comprador: string
  comprador: { id_usuario: string; nombre: string; foto_url?: string }
  items: ItemOrden[]
}

interface Mensaje {
  id_mensaje: string
  contenido: string
  created_at: string
  id_remitente: string
  remitente: { id_usuario: string; nombre: string; foto_url?: string }
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700' },
  pagada:     { label: 'Pagada',     color: 'bg-blue-100 text-blue-700' },
  en_entrega: { label: 'En entrega', color: 'bg-purple-100 text-purple-700' },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-700' },
  cancelada:  { label: 'Cancelada',  color: 'bg-red-100 text-red-700' },
}

export default function OrdenDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuthStore()
  const [orden, setOrden] = useState<Orden | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [tab, setTab] = useState<'detalle' | 'chat'>('detalle')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get(`/api/ordenes/${id}`),
      api.get(`/api/mensajes/${id}`),
    ]).then(([oRes, mRes]) => {
      setOrden(oRes.data.data)
      setMensajes(mRes.data.data)
    }).finally(() => setLoading(false))
  }, [id])

  // Conectar WebSocket y unirse a la sala de la orden
  useEffect(() => {
    if (!id || !orden) return
    const socket = connectSocket(useAuthStore.getState().token!)

    socket.emit('join_order', id)
    socket.on('new_message', (msg: Mensaje) => {
      setMensajes(prev => [...prev, msg])
    })

    return () => {
      socket.emit('leave_order', id)
      socket.off('new_message')
    }
  }, [id, orden])

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  function enviarMensaje(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)
    const socket = connectSocket(useAuthStore.getState().token!)
    socket.emit('send_message', { id_orden: id, contenido: texto.trim() })
    setTexto('')
    setEnviando(false)
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )

  if (!orden) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="text-gray-500">Orden no encontrada</p>
      <Link to="/dashboard" className="btn-primary inline-block mt-4">Volver al dashboard</Link>
    </div>
  )

  const est = ESTADO_LABEL[orden.estado] ?? { label: orden.estado, color: 'bg-gray-100 text-gray-600' }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={16} /> Volver al dashboard
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Orden #{orden.id_orden.slice(0, 8).toUpperCase()}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{new Date(orden.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${est.color}`}>{est.label}</span>
      </div>

      {/* Tabs para móvil */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6 md:hidden">
        {(['detalle', 'chat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600'}`}>
            {t === 'chat' ? <span className="flex items-center gap-1"><MessageCircle size={14} /> Chat</span> : <span className="flex items-center gap-1"><Package size={14} /> Detalle</span>}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Detalle */}
        <div className={tab === 'chat' ? 'hidden md:block' : ''}>
          <div className="card mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">Productos</h2>
            <div className="space-y-3">
              {orden.items.map(item => (
                <div key={item.id_item} className="flex gap-3">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.producto.imagenes?.[0]
                      ? <img src={item.producto.imagenes[0].url} alt={item.producto.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/producto/${item.producto.id_producto}`} className="font-medium text-gray-800 text-sm line-clamp-2 hover:text-green-700">{item.producto.nombre}</Link>
                    <p className="text-gray-500 text-xs mt-0.5">x{item.cantidad} · ${Number(item.precio_unitario).toLocaleString('es-CO')} c/u</p>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">${Number(item.subtotal).toLocaleString('es-CO')}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-green-700">${Number(orden.total).toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          <div className="card text-sm space-y-2">
            <p className="text-gray-500">Método de pago: <span className="font-medium text-gray-700 capitalize">{orden.metodo_pago}</span></p>
            <p className="text-gray-500">Comprador: <span className="font-medium text-gray-700">{orden.comprador.nombre}</span></p>
          </div>
        </div>

        {/* Chat */}
        <div className={`${tab === 'detalle' ? 'hidden md:flex' : 'flex'} flex-col`}>
          <div className="card flex flex-col h-[420px]">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MessageCircle size={16} className="text-green-600" /> Chat
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {mensajes.length === 0
                ? <p className="text-center text-gray-400 text-sm py-8">Sin mensajes aún. ¡Inicia la conversación!</p>
                : mensajes.map(m => {
                  const esMio = m.id_remitente === usuario?.id_usuario
                  return (
                    <div key={m.id_mensaje} className={`flex gap-2 ${esMio ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0">
                        {m.remitente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${esMio ? 'bg-green-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                        <p>{m.contenido}</p>
                        <p className={`text-[10px] mt-1 ${esMio ? 'text-green-200' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={enviarMensaje} className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <input
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="input text-sm flex-1"
                maxLength={1000}
              />
              <button type="submit" disabled={!texto.trim() || enviando}
                className="btn-primary px-3 flex items-center gap-1 disabled:opacity-50">
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
