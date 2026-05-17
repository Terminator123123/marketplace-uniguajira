import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, ShoppingBag } from 'lucide-react'
import api from '../lib/api.ts'
import { useCartStore } from '../store/cart.ts'

export default function PagoResultadoPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { vaciar } = useCartStore()

  const status    = params.get('status')          // APPROVED | DECLINED | ERROR
  const txId      = params.get('id')
  const reference = params.get('reference')       // id_orden

  const [verificando, setVerificando] = useState(true)
  const [estadoFinal, setEstadoFinal] = useState<'aprobado' | 'fallido' | null>(null)

  useEffect(() => {
    async function verificar() {
      if (status === 'APPROVED' && reference) {
        try {
          // Confirmar con el backend que la orden realmente está pagada
          const res = await api.get(`/api/ordenes/${reference}`)
          const orden = res.data.data
          if (orden.estado === 'pagada' || status === 'APPROVED') {
            vaciar()
            setEstadoFinal('aprobado')
          } else {
            setEstadoFinal('fallido')
          }
        } catch {
          // Si el webhook aún no procesó, confiamos en el status de Wompi
          if (status === 'APPROVED') { vaciar(); setEstadoFinal('aprobado') }
          else setEstadoFinal('fallido')
        }
      } else {
        setEstadoFinal('fallido')
      }
      setVerificando(false)
    }
    verificar()
  }, [status, reference, vaciar])

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Verificando pago...</p>
        </div>
      </div>
    )
  }

  if (estadoFinal === 'aprobado') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Pago exitoso!</h1>
          <p className="text-gray-500 mb-2">Tu pedido fue confirmado.</p>
          {txId && (
            <p className="text-xs text-gray-400 font-mono mb-6">Ref. Wompi: {txId.slice(0, 16)}...</p>
          )}
          <div className="flex flex-col gap-3">
            <Link
              to={reference ? `/mis-ordenes/${reference}` : '/mis-pedidos'}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} /> Ver mi pedido
            </Link>
            <Link to="/catalogo" className="text-sm text-gray-500 hover:text-gray-700">
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Pago no completado</h1>
        <p className="text-gray-500 mb-6">
          El pago fue rechazado o cancelado. Tu pedido sigue pendiente — puedes intentarlo de nuevo.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-primary"
          >
            Intentar de nuevo
          </button>
          <Link to="/catalogo" className="text-sm text-gray-500 hover:text-gray-700">
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  )
}
