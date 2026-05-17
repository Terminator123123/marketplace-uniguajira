import { useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ArrowLeft, Loader2, Bike, MapPin, CreditCard, Lock } from 'lucide-react'
import api from '../lib/api.ts'
import { useCartStore } from '../store/cart.ts'
import { useAuthStore } from '../store/auth.ts'
import type { MetodoPago } from '@marketplace/shared'

const COSTO_DELIVERY_BASE = 1500
const COSTO_DELIVERY_EXTRA = 500

interface WidgetData {
  publicKey: string
  amountInCents: number
  reference: string
  currency: string
  firma: string
  redirectUrl: string
}

export default function CheckoutPage() {
  const { items, total } = useCartStore()
  const { usuario } = useAuthStore()

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('nequi')
  const [delivery, setDelivery] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paso, setPaso] = useState<'carrito' | 'pagando'>('carrito')
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [errorTerminos, setErrorTerminos] = useState(false)

  const grupos = useMemo(() => {
    const map = new Map<string, { tienda_nombre: string; items: typeof items }>()
    for (const item of items) {
      const id = item.producto.id_tienda
      const nombre = item.producto.tienda_nombre ?? 'Tienda'
      if (!map.has(id)) map.set(id, { tienda_nombre: nombre, items: [] })
      map.get(id)!.items.push(item)
    }
    return Array.from(map.values())
  }, [items])

  const numTiendas = grupos.length
  const costoDelivery = delivery
    ? COSTO_DELIVERY_BASE + Math.max(0, numTiendas - 1) * COSTO_DELIVERY_EXTRA
    : 0
  const totalFinal = total() + costoDelivery

  // Montar el widget de Wompi cuando tengamos los datos
  useEffect(() => {
    if (!widgetData || paso !== 'pagando' || !widgetRef.current) return

    const container = widgetRef.current
    container.innerHTML = ''

    const form = document.createElement('form')
    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.setAttribute('data-render', 'button')
    script.setAttribute('data-public-key', widgetData.publicKey)
    script.setAttribute('data-currency', widgetData.currency)
    script.setAttribute('data-amount-in-cents', String(widgetData.amountInCents))
    script.setAttribute('data-reference', widgetData.reference)
    script.setAttribute('data-signature:integrity', widgetData.firma)
    script.setAttribute('data-redirect-url', widgetData.redirectUrl)
    if (usuario?.nombre) script.setAttribute('data-customer-data:full-name', usuario.nombre)

    form.appendChild(script)
    container.appendChild(form)
  }, [widgetData, paso, usuario])

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Tu carrito está vacío</p>
        <Link to="/catalogo" className="btn-primary inline-block">Ver catálogo</Link>
      </div>
    )
  }

  async function handleIrAPagar() {
    if (!aceptaTerminos) { setErrorTerminos(true); return }
    setErrorTerminos(false)
    setLoading(true)
    setError('')
    try {
      // 1. Crear la orden en el backend
      const payload = {
        items: items.map(i => ({ id_producto: i.producto.id_producto, cantidad: i.cantidad })),
        metodo_pago: metodoPago,
      }
      const ordenRes = await api.post('/api/ordenes', payload)
      const ordenId: string = ordenRes.data.data.id_orden

      // 2. Obtener datos firmados para el widget
      const checkoutRes = await api.get(`/api/pagos/checkout-data/${ordenId}`)
      setWidgetData(checkoutRes.data.data)
      setPaso('pagando')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al iniciar el pago. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Paso 2: mostrar widget de Wompi ──────────────────────────────────────────
  if (paso === 'pagando' && widgetData) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <button
          onClick={() => setPaso('carrito')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6"
        >
          <ArrowLeft size={16} /> Volver al carrito
        </button>

        <div className="card space-y-5">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-green-700" />
            <h2 className="font-semibold text-gray-800">Pago seguro</h2>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${total().toLocaleString('es-CO')}</span>
            </div>
            {delivery && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span>
                <span>${costoDelivery.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>Total a pagar</span>
              <span>${totalFinal.toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Al hacer clic en "Pagar" serás redirigido al formulario seguro de Wompi.
            Puedes usar Nequi, Daviplata, PSE o tarjeta.
          </p>

          {/* Wompi widget se monta aquí */}
          <div ref={widgetRef} className="flex justify-center" />
        </div>
      </div>
    )
  }

  // ── Paso 1: resumen del carrito ───────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/catalogo" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={16} /> Seguir comprando
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Resumen del pedido</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Items agrupados por tienda */}
        <div className="md:col-span-2 space-y-4">
          {grupos.map(grupo => (
            <div key={grupo.tienda_nombre}>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">{grupo.tienda_nombre}</p>
              <div className="space-y-2">
                {grupo.items.map(({ producto, cantidad }) => (
                  <div key={producto.id_producto} className="card flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {producto.imagenes?.[0] ? (
                        <img src={producto.imagenes[0].url} alt={producto.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm line-clamp-2">{producto.nombre}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Cantidad: {cantidad}</p>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm whitespace-nowrap">
                      ${(Number(producto.precio) * cantidad).toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Selector delivery / recogida */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Entrega</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDelivery(true)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  delivery ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Bike size={24} className={delivery ? 'text-green-700' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${delivery ? 'text-green-700' : 'text-gray-600'}`}>Delivery</span>
                <span className="text-xs text-gray-500">
                  ${COSTO_DELIVERY_BASE.toLocaleString('es-CO')}
                  {numTiendas > 1 && ` + $${((numTiendas - 1) * COSTO_DELIVERY_EXTRA).toLocaleString('es-CO')} extra`}
                </span>
              </button>
              <button
                onClick={() => setDelivery(false)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  !delivery ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MapPin size={24} className={!delivery ? 'text-green-700' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${!delivery ? 'text-green-700' : 'text-gray-600'}`}>Recoger</span>
                <span className="text-xs text-gray-500">Sin costo adicional</span>
              </button>
            </div>
            {delivery && numTiendas > 1 && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                Tu pedido viene de {numTiendas} tiendas. El repartidor cobra ${COSTO_DELIVERY_EXTRA.toLocaleString('es-CO')} adicional por cada tienda extra.
              </p>
            )}
          </div>
        </div>

        {/* Panel de pago */}
        <div className="card h-fit space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard size={18} className="text-green-700" />
            Método de pago
          </h2>

          <div className="space-y-2">
            {([
              { value: 'nequi'     as MetodoPago, label: 'Nequi',     icon: '💜' },
              { value: 'daviplata' as MetodoPago, label: 'Daviplata', icon: '🔴' },
              { value: 'pse'       as MetodoPago, label: 'PSE',       icon: '🏦' },
            ]).map(m => (
              <label key={m.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                metodoPago === m.value ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="metodo"
                  value={m.value}
                  checked={metodoPago === m.value}
                  onChange={() => setMetodoPago(m.value)}
                  className="sr-only"
                />
                <span className="text-xl">{m.icon}</span>
                <span className="font-medium text-gray-800 text-sm">{m.label}</span>
              </label>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${total().toLocaleString('es-CO')}</span>
            </div>
            {delivery && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span>
                <span>${costoDelivery.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-800 font-bold pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>${totalFinal.toLocaleString('es-CO')} COP</span>
            </div>

            <label className="flex items-start gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={e => { setAceptaTerminos(e.target.checked); setErrorTerminos(false) }}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 flex-shrink-0"
              />
              <span className="text-xs text-gray-500">
                Acepto los{' '}
                <a href="/legal" target="_blank" className="text-green-700 hover:underline">Términos y Condiciones</a>
                {' '}y la{' '}
                <a href="/legal" target="_blank" className="text-green-700 hover:underline">Política de Devoluciones</a>
              </span>
            </label>
            {errorTerminos && <p className="text-red-500 text-xs">Debes aceptar los términos para continuar.</p>}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              onClick={handleIrAPagar}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Preparando pago...</>
                : <><Lock size={14} /> Ir a pagar con Wompi</>
              }
            </button>

            <p className="text-[10px] text-gray-400 text-center">
              Pago procesado por Wompi · Bancolombia Group
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
