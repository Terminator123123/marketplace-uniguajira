import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'
import { validateUUID } from '../middleware/security.js'

const router = Router()
const prisma = new PrismaClient()

// ─── Perfil propio ───────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: req.user!.id },
    select: {
      id_usuario: true, nombre: true, email: true, rol: true,
      facultad: true, bio: true, foto_url: true, rating_promedio: true,
      activo: true, email_verificado: true, created_at: true,
    },
  })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  res.json({ data: usuario })
})

router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  const UpdateSchema = z.object({
    nombre: z.string().min(2).max(100).optional(),
    bio: z.string().max(500).optional(),
    facultad: z.string().max(100).optional(),
  })
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }
  const usuario = await prisma.usuario.update({
    where: { id_usuario: req.user!.id },
    data: parsed.data,
    select: { id_usuario: true, nombre: true, bio: true, facultad: true, foto_url: true },
  })
  res.json({ data: usuario })
})

// ─── Cambiar contraseña ───────────────────────────────────────────────────────

router.put('/me/password', requireAuth, async (req: AuthRequest, res) => {
  const Schema = z.object({
    password_actual: z.string().min(1),
    password_nuevo: z.string()
      .min(16, 'Mínimo 16 caracteres')
      .regex(/[A-Z]/, 'Debe tener mayúscula')
      .regex(/[a-z]/, 'Debe tener minúscula')
      .regex(/[0-9]/, 'Debe tener número')
      .regex(/[^A-Za-z0-9]/, 'Debe tener símbolo'),
  })
  const parsed = Schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }); return
  }
  const { password_actual, password_nuevo } = parsed.data
  const usuario = await prisma.usuario.findUnique({ where: { id_usuario: req.user!.id } })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }

  const ok = await bcrypt.compare(password_actual, usuario.password_hash)
  if (!ok) { res.status(401).json({ error: 'Contraseña actual incorrecta' }); return }

  const password_hash = await bcrypt.hash(password_nuevo, 12)
  await prisma.usuario.update({
    where: { id_usuario: req.user!.id },
    data: { password_hash, intentos_fallidos: 0, bloqueado_hasta: null },
  })
  res.json({ message: 'Contraseña actualizada correctamente' })
})

// ─── Admin: listado de usuarios ──────────────────────────────────────────────

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { rol, activo, buscar, page = '1', limit = '20' } = req.query as Record<string, string>

  const where: Record<string, unknown> = {}
  if (rol) where['rol'] = rol
  if (activo !== undefined) where['activo'] = activo === 'true'
  if (buscar) {
    where['OR'] = [
      { nombre: { contains: buscar, mode: 'insensitive' } },
      { email: { contains: buscar, mode: 'insensitive' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const take = Math.min(parseInt(limit), 100)

  const [usuarios, total] = await prisma.$transaction([
    prisma.usuario.findMany({
      where,
      select: {
        id_usuario: true, nombre: true, email: true, rol: true,
        facultad: true, activo: true, email_verificado: true, created_at: true,
        _count: { select: { ordenes: true, solicitudes: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.usuario.count({ where }),
  ])

  res.json({ data: usuarios, meta: { total, page: parseInt(page), limit: take } })
})

// ─── Admin: ver un usuario ───────────────────────────────────────────────────

router.get('/:id', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: req.params['id'] },
    select: {
      id_usuario: true, nombre: true, email: true, rol: true, facultad: true,
      bio: true, foto_url: true, rating_promedio: true, activo: true,
      email_verificado: true, created_at: true,
      tienda: { select: { id_tienda: true, nombre_tienda: true, estado: true } },
      _count: { select: { ordenes: true, resenas: true, solicitudes: true } },
    },
  })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  res.json({ data: usuario })
})

// ─── Admin: activar usuario ──────────────────────────────────────────────────

router.patch('/:id/activar', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const usuario = await prisma.usuario.update({
    where: { id_usuario: req.params['id'] },
    data: { activo: true },
    select: { id_usuario: true, nombre: true, activo: true },
  })
  res.json({ data: usuario, message: 'Usuario activado' })
})

// ─── Admin: suspender usuario ─────────────────────────────────────────────────

router.patch('/:id/suspender', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const usuario = await prisma.usuario.update({
    where: { id_usuario: req.params['id'] },
    data: { activo: false },
    select: { id_usuario: true, nombre: true, activo: true },
  })
  res.json({ data: usuario, message: 'Usuario suspendido' })
})

// ─── Admin: cambiar rol ───────────────────────────────────────────────────────

router.patch('/:id/rol', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const RolSchema = z.object({ rol: z.enum(['comprador', 'vendedor', 'admin']) })
  const parsed = RolSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Rol inválido' }); return
  }

  const usuario = await prisma.usuario.update({
    where: { id_usuario: req.params['id'] },
    data: { rol: parsed.data.rol },
    select: { id_usuario: true, nombre: true, rol: true },
  })
  res.json({ data: usuario, message: `Rol cambiado a ${parsed.data.rol}` })
})

// ─── Admin: eliminar usuario (soft delete) ────────────────────────────────────

router.delete('/:id', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  // Anonimizar en lugar de borrar para preservar integridad referencial
  await prisma.usuario.update({
    where: { id_usuario: id },
    data: {
      activo: false,
      nombre: '[Eliminado]',
      email: `deleted_${id}@eliminado.local`,
      bio: null,
      foto_url: null,
    },
  })
  res.json({ message: 'Cuenta eliminada' })
})

// ─── Admin: estadísticas del sistema ─────────────────────────────────────────

router.get('/admin/stats', requireAuth, requireRole('admin'), async (_req, res) => {
  const [
    totalUsuarios,
    usuariosActivos,
    totalVendedores,
    totalProductos,
    productosActivos,
    totalOrdenes,
    ordenesPendientes,
    ordenesCompletadas,
    totalTiendas,
    tiendasActivas,
    solicitudesPendientes,
    usuariosHoy,
    ordenesHoy,
  ] = await prisma.$transaction([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { activo: true } }),
    prisma.usuario.count({ where: { rol: 'vendedor' } }),
    prisma.producto.count(),
    prisma.producto.count({ where: { activo: true } }),
    prisma.orden.count(),
    prisma.orden.count({ where: { estado: 'pendiente' } }),
    prisma.orden.count({ where: { estado: 'completada' } }),
    prisma.tienda.count(),
    prisma.tienda.count({ where: { estado: 'activa' } }),
    prisma.solicitudRol.count({ where: { estado: 'pendiente' } }),
    prisma.usuario.count({ where: { created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.orden.count({ where: { created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ])

  const ingresosTotales = await prisma.orden.aggregate({
    _sum: { total: true },
    where: { estado: { in: ['pagada', 'completada'] } },
  })

  res.json({
    data: {
      usuarios: { total: totalUsuarios, activos: usuariosActivos, vendedores: totalVendedores, registradosHoy: usuariosHoy },
      productos: { total: totalProductos, activos: productosActivos },
      ordenes: { total: totalOrdenes, pendientes: ordenesPendientes, completadas: ordenesCompletadas, creadasHoy: ordenesHoy },
      tiendas: { total: totalTiendas, activas: tiendasActivas },
      solicitudes: { pendientes: solicitudesPendientes },
      ingresos: { total: Number(ingresosTotales._sum.total ?? 0) },
    },
  })
})

export default router
