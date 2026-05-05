import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.ts'

import Layout from './components/Layout.tsx'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import CatalogPage from './pages/CatalogPage.tsx'
import ProductPage from './pages/ProductPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="catalogo" element={<CatalogPage />} />
          <Route path="producto/:id" element={<ProductPage />} />
          <Route path="dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
