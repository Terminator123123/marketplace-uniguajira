// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'vendedor' | 'comprador' | 'admin'
export type TiendaEstado = 'pendiente' | 'activa' | 'suspendida'
export type ProductoTipo = 'fisico' | 'servicio'
export type OrdenEstado = 'pendiente' | 'pagada' | 'en_entrega' | 'completada' | 'cancelada'
export type MetodoPago = 'nequi' | 'daviplata' | 'pse'

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id_usuario: string
  nombre: string
  email: string
  rol: UserRole
  facultad?: string
  bio?: string
  foto_url?: string
  rating_promedio: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface UsuarioPublico {
  id_usuario: string
  nombre: string
  email?: string
  rol: UserRole
  facultad?: string
  bio?: string
  foto_url?: string
  rating_promedio: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  nombre: string
  email: string
  password: string
  facultad?: string
}

export interface AuthResponse {
  usuario: UsuarioPublico
  access_token: string
}

// ─── Tiendas ──────────────────────────────────────────────────────────────────

export interface Tienda {
  id_tienda: string
  id_vendedor: string
  nombre_tienda: string
  descripcion?: string
  banner_url?: string
  estado: TiendaEstado
  created_at: string
  vendedor?: UsuarioPublico
}

// ─── Productos ────────────────────────────────────────────────────────────────

export interface ImagenProducto {
  id_imagen: string
  url: string
  orden: number
  es_principal: boolean
}

export interface Producto {
  id_producto: string
  id_tienda: string
  id_vendedor: string
  nombre: string
  descripcion?: string
  precio: number
  tipo: ProductoTipo
  categoria: string
  stock?: number
  activo: boolean
  vistas: number
  created_at: string
  updated_at: string
  imagenes?: ImagenProducto[]
  tienda?: Pick<Tienda, 'nombre_tienda' | 'id_tienda'>
  vendedor?: UsuarioPublico
}

export interface CrearProductoRequest {
  nombre: string
  descripcion?: string
  precio: number
  tipo: ProductoTipo
  categoria: string
  stock?: number
}

// ─── Órdenes ──────────────────────────────────────────────────────────────────

export interface ItemOrden {
  id_item: string
  id_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  producto?: Pick<Producto, 'nombre' | 'imagenes'>
}

export interface Orden {
  id_orden: string
  id_comprador: string
  total: number
  comision_porcentaje?: number
  monto_comision?: number
  monto_vendedor?: number
  estado: OrdenEstado
  metodo_pago: MetodoPago
  referencia_pago?: string
  created_at: string
  updated_at: string
  items?: ItemOrden[]
  comprador?: UsuarioPublico
}

export interface CrearOrdenRequest {
  items: { id_producto: string; cantidad: number }[]
  metodo_pago: MetodoPago
}

// ─── Reseñas ──────────────────────────────────────────────────────────────────

export interface Resena {
  id_resena: string
  id_orden: string
  id_comprador: string
  id_producto: string
  estrellas: number
  comentario?: string
  created_at: string
  comprador?: UsuarioPublico
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  details?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FiltrosProducto {
  tipo?: ProductoTipo
  categoria?: string
  precio_min?: number
  precio_max?: number
  busqueda?: string
  page?: number
  limit?: number
}
