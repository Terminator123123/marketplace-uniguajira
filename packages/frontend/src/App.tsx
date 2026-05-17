import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.ts'
import { useToastStore } from './store/toasts.ts'
import { connectSocket, disconnectSocket } from './lib/socket.ts'

import Layout from './components/Layout.tsx'
import Toasts from './components/Toasts.tsx'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import CatalogPage from './pages/CatalogPage.tsx'
import ProductPage from './pages/ProductPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import CheckoutPage from './pages/CheckoutPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import ResetPasswordPage from './pages/ResetPasswordPage.tsx'
import TiendaPage from './pages/TiendaPage.tsx'
import VerificarEmailPage from './pages/VerificarEmailPage.tsx'
import OrdenDetallePage from './pages/OrdenDetallePage.tsx'
import FavoritosPage from './pages/FavoritosPage.tsx'
import PerfilPage from './pages/PerfilPage.tsx'
import MisPedidosPage from './pages/MisPedidosPage.tsx'
import PagoResultadoPage from './pages/PagoResultadoPage.tsx'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function SocketProvider() {
  const token = useAuthStore(s => s.token)
  const push = useToastStore(s => s.push)

  useEffect(() => {
    if (!token) { disconnectSocket(); return }

    const socket = connectSocket(token)

    socket.on('nueva_orden', (data: { id_orden: string; total: number }) => {
      push('success', `Nueva orden recibida — $${data.total.toLocaleString('es-CO')} COP`)
    })

    socket.on('orden_pagada', (data: { id_orden: string; total: number }) => {
      push('success', `¡Pago confirmado! Orden por $${data.total.toLocaleString('es-CO')} COP`)
    })

    socket.on('orden_actualizada', (data: { estado: string }) => {
      const estados: Record<string, string> = {
        pagada: 'Tu pago fue confirmado',
        en_entrega: 'Tu pedido está en camino',
        completada: 'Tu pedido fue completado',
        cancelada: 'Tu orden fue cancelada',
      }
      push('info', estados[data.estado] ?? `Orden actualizada: ${data.estado}`)
    })

    return () => {
      socket.off('nueva_orden')
      socket.off('orden_actualizada')
      socket.off('orden_pagada')
    }
  }, [token, push])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider />
      <Toasts />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verificar-email" element={<VerificarEmailPage />} />
          <Route path="catalogo" element={<CatalogPage />} />
          <Route path="producto/:id" element={<ProductPage />} />
          <Route path="checkout" element={
            <ProtectedRoute><CheckoutPage /></ProtectedRoute>
          } />
          <Route path="dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="tienda/:id" element={<TiendaPage />} />
          <Route path="mis-ordenes/:id" element={
            <ProtectedRoute><OrdenDetallePage /></ProtectedRoute>
          } />
          <Route path="favoritos" element={
            <ProtectedRoute><FavoritosPage /></ProtectedRoute>
          } />
          <Route path="perfil" element={
            <ProtectedRoute><PerfilPage /></ProtectedRoute>
          } />
          <Route path="mis-pedidos" element={
            <ProtectedRoute><MisPedidosPage /></ProtectedRoute>
          } />
          <Route path="pago/resultado" element={
            <ProtectedRoute><PagoResultadoPage /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
