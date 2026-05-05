import { useEffect, useState } from 'react'
import { Package, ShoppingBag, Star, TrendingUp } from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '../store/auth.ts'
import type { Orden } from '@marketplace/shared'

export default function DashboardPage() {
  const { usuario, token } = useAuthStore()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get('/api/ordenes/mis-ordenes', { headers }).then(r => setOrdenes(r.data.data))
  }, [])

  const totalVentas = ordenes.filter(o => o.estado === 'completada').reduce((s, o) => s + Number(o.total), 0)
  const pendientes = ordenes.filter(o => o.estado === 'pendiente').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Bienvenido, {usuario?.nombre}</p>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: TrendingUp, label: 'Ventas totales', value: `$${totalVentas.toLocaleString('es-CO')}`, color: 'text-green-600' },
          { icon: ShoppingBag, label: 'Órdenes totales', value: ordenes.length, color: 'text-blue-600' },
          { icon: Package, label: 'Pendientes', value: pendientes, color: 'text-orange-600' },
          { icon: Star, label: 'Rating', value: Number(usuario?.rating_promedio ?? 0).toFixed(1), color: 'text-yellow-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card">
            <Icon size={24} className={`${color} mb-2`} />
            <p className="text-gray-500 text-sm">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Órdenes recientes */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Órdenes recientes</h2>
        {ordenes.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Sin órdenes aún</p>
        ) : (
          <div className="space-y-3">
            {ordenes.slice(0, 10).map(o => (
              <div key={o.id_orden} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-700">{o.id_orden.slice(0, 8)}...</p>
                  <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString('es-CO')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">${Number(o.total).toLocaleString('es-CO')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    o.estado === 'completada' ? 'bg-green-100 text-green-700' :
                    o.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{o.estado}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
