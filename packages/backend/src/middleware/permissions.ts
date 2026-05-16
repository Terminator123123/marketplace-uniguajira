/**
 * Sistema de permisos RBAC centralizado.
 *
 * Define qué puede hacer cada rol en el sistema.
 * Inspirado en el sistema de permisos de Django pero adaptado a Express.
 *
 * Uso: canDo('vendedor', 'crear_producto')
 * Middleware: requirePermission('crear_producto')
 */

import { Response, NextFunction } from 'express'
import type { UserRole } from '@marketplace/shared'
import type { AuthRequest } from './auth.js'

// ─── Mapa de permisos por rol ─────────────────────────────────────────────────

const PERMISOS: Record<UserRole, readonly string[]> = {
  comprador: [
    'ver_catalogo',
    'ver_producto',
    'crear_orden',
    'ver_mis_ordenes',
    'ver_mi_perfil',
    'editar_mi_perfil',
    'crear_resena',
    'enviar_mensaje',
    'solicitar_ser_vendedor',
  ],
  vendedor: [
    // Hereda permisos de comprador
    'ver_catalogo',
    'ver_producto',
    'crear_orden',
    'ver_mis_ordenes',
    'ver_mi_perfil',
    'editar_mi_perfil',
    'crear_resena',
    'enviar_mensaje',
    // Permisos exclusivos de vendedor
    'crear_producto',
    'editar_mi_producto',
    'eliminar_mi_producto',
    'ver_mi_tienda',
    'editar_mi_tienda',
    'subir_imagenes',
    'ver_mis_ventas',
  ],
  admin: [
    // Control total
    'ver_catalogo',
    'ver_producto',
    'crear_orden',
    'ver_mis_ordenes',
    'ver_mi_perfil',
    'editar_mi_perfil',
    'crear_resena',
    'enviar_mensaje',
    'crear_producto',
    'editar_mi_producto',
    'eliminar_mi_producto',
    'ver_mi_tienda',
    'editar_mi_tienda',
    'subir_imagenes',
    'ver_mis_ventas',
    // Exclusivos de admin
    'gestionar_usuarios',
    'activar_usuario',
    'suspender_usuario',
    'cambiar_rol',
    'ver_estadisticas',
    'gestionar_solicitudes',
    'eliminar_cualquier_producto',
    'ver_todas_las_ordenes',
    'gestionar_tiendas',
  ],
} as const

export type Permiso = (typeof PERMISOS)[UserRole][number]

// ─── Helper de verificación ───────────────────────────────────────────────────

export function canDo(rol: UserRole, permiso: string): boolean {
  return (PERMISOS[rol] as readonly string[]).includes(permiso)
}

// ─── Middleware requirePermission ─────────────────────────────────────────────

export function requirePermission(permiso: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' })
      return
    }
    if (!canDo(req.user.rol, permiso)) {
      res.status(403).json({ error: 'Acceso denegado' })
      return
    }
    next()
  }
}

// ─── Helper para el frontend ──────────────────────────────────────────────────
// Devuelve todos los permisos de un rol para que el cliente adapte la UI.

export function getPermisosDeRol(rol: UserRole): readonly string[] {
  return PERMISOS[rol]
}
