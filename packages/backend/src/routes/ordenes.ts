import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'
import { validateUUID } from '../middleware/security.js'
import { getIO } from '../socket.js'
import { enviarNuevaOrden, enviarCambioEstadoOrden } from '../services/email.js'

const router = Router()
const prisma = new PrismaClient()

const OrdenSchema = z.object({
  items: z.array(z.object({
    id_producto: z.string().uuid(),
    cantidad: z.number().int().positive(),
  })).min(1),
  metodo_pago: z.enum(['nequi', 'daviplata', 'pse']),
})

// Crear orden
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = OrdenSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { items, metodo_pago } = parsed.data

  const productos = await prisma.producto.findMany({
    where: { id_producto: { in: items.map(i => i.id_producto) }, activo: true },
  })

  if (productos.length !== items.length) {
    res.status(400).json({ error: 'Uno o más productos no están disponibles' })
    return
  }

  for (const item of items) {
    const prod = productos.find((p: typeof productos[0]) => p.id_producto === item.id_producto)!
    if (prod.stock !== null && prod.stock < item.cantidad) {
      res.status(400).json({ error: `Stock insuficiente para: ${prod.nombre}` })
      return
    }
  }

  const itemsConPrecio = items.map(item => {
    const prod = productos.find((p: typeof productos[0]) => p.id_producto === item.id_producto)!
    const precio_unitario = Number(prod.precio)
    return { id_producto: item.id_producto, cantidad: item.cantidad, precio_unitario, subtotal: precio_unitario * item.cantidad }
  })

  const total = itemsConPrecio.reduce((sum, i) => sum + i.subtotal, 0)
  const COMISION_PCT = 15
  const monto_comision = Math.round(total * (COMISION_PCT / 100) * 100) / 100
  const monto_vendedor = Math.round((total - monto_comision) * 100) / 100

  const orden = await prisma.orden.create({
    data: {
      id_comprador: req.user!.id,
      total,
      comision_porcentaje: COMISION_PCT,
      monto_comision,
      monto_vendedor,
      metodo_pago,
      items: { create: itemsConPrecio },
    },
    include: { items: { include: { producto: { select: { id_vendedor: true } } } } },
  })

  // Notificar a cada vendedor (WebSocket + email)
  const io = getIO()
  const vendedores = new Set(orden.items.map(i => i.producto.id_vendedor))

  for (const vendedorId of vendedores) {
    io?.to(`user:${vendedorId}`).emit('nueva_orden', {
      id_orden: orden.id_orden,
      total: Number(orden.total),
      metodo_pago: orden.metodo_pago,
      created_at: orden.created_at,
    })

    prisma.usuario.findUnique({ where: { id_usuario: vendedorId }, select: { nombre: true, email: true } })
      .then(v => {
        if (v) enviarNuevaOrden(v.nombre, v.email, Number(orden.total), orden.id_orden)
          .catch(e => console.error('[email nueva_orden]', e))
      })
      .catch(() => {})
  }

  res.status(201).json({ data: orden })
})

// Mis órdenes
router.get('/mis-ordenes', requireAuth, async (req: AuthRequest, res) => {
  const ordenes = await prisma.orden.findMany({
    where: { id_comprador: req.user!.id },
    orderBy: { created_at: 'desc' },
    include: {
      items: { include: { producto: { select: { nombre: true, imagenes: { where: { es_principal: true }, take: 1 } } } } },
    },
  })
  res.json({ data: ordenes })
})

// Admin: todas las órdenes del sistema
router.get('/admin/todas', requireAuth, requireRole('admin'), async (req, res) => {
  const { estado, page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, parseInt(limit))

  const where: Record<string, unknown> = {}
  if (estado) where['estado'] = estado

  const [ordenes, total] = await Promise.all([
    prisma.orden.findMany({
      where,
      include: {
        comprador: { select: { nombre: true, email: true } },
        items: {
          include: {
            producto: { select: { nombre: true, id_vendedor: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.orden.count({ where }),
  ])

  res.json({ data: ordenes, total, page: pageNum, totalPages: Math.ceil(total / limitNum) })
})

// Órdenes del vendedor (contienen al menos un producto suyo)
router.get('/vendedor', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const { estado, page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, parseInt(limit))

  const where: Record<string, unknown> = {
    items: { some: { producto: { id_vendedor: req.user!.id } } },
  }
  if (estado) where['estado'] = estado

  const [ordenes, total] = await Promise.all([
    prisma.orden.findMany({
      where,
      include: {
        comprador: { select: { nombre: true, email: true, foto_url: true } },
        items: {
          where: { producto: { id_vendedor: req.user!.id } },
          include: { producto: { select: { nombre: true, imagenes: { where: { es_principal: true }, take: 1 } } } },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.orden.count({ where }),
  ])

  res.json({ data: ordenes, total, page: pageNum, totalPages: Math.ceil(total / limitNum) })
})

// Detalle de orden (comprador, vendedor de esa orden, o admin)
router.get('/:id', validateUUID('id'), requireAuth, async (req: AuthRequest, res) => {
  const orden = await prisma.orden.findUnique({
    where: { id_orden: req.params['id'] },
    include: {
      comprador: { select: { id_usuario: true, nombre: true, foto_url: true } },
      items: {
        include: {
          producto: {
            select: { id_producto: true, nombre: true, precio: true, id_vendedor: true, imagenes: { where: { es_principal: true }, take: 1 } },
          },
        },
      },
    },
  })

  if (!orden) { res.status(404).json({ error: 'Orden no encontrada' }); return }

  const userId = req.user!.id
  const esComprador = orden.id_comprador === userId
  const esVendedor = orden.items.some(i => i.producto.id_vendedor === userId)
  const esAdmin = req.user!.rol === 'admin'

  if (!esComprador && !esVendedor && !esAdmin) {
    res.status(404).json({ error: 'Orden no encontrada' }); return
  }

  res.json({ data: orden })
})

// Actualizar estado de orden
router.patch('/:id/estado', validateUUID('id'), requireAuth, async (req: AuthRequest, res) => {
  const { estado } = req.body as { estado: string }
  const estadosValidos = ['pendiente', 'pagada', 'en_entrega', 'completada', 'cancelada']
  if (!estadosValidos.includes(estado)) {
    res.status(400).json({ error: 'Estado inválido' }); return
  }

  const orden = await prisma.orden.findUnique({
    where: { id_orden: req.params['id'] },
    include: { items: { include: { producto: { select: { id_vendedor: true } } } } },
  })
  if (!orden) { res.status(404).json({ error: 'Orden no encontrada' }); return }

  const userId = req.user!.id
  const rol = req.user!.rol
  const esComprador = orden.id_comprador === userId
  const esVendedor = orden.items.some(i => i.producto.id_vendedor === userId)

  // Validar transiciones por rol
  const transicionesPermitidas: Record<string, string[]> = {
    comprador: ['cancelada'],
    vendedor: ['en_entrega', 'completada'],
    admin: estadosValidos,
  }
  const estadosOrigenPermitidos: Record<string, string[]> = {
    en_entrega: ['pagada'],
    completada: ['en_entrega'],
    cancelada: ['pendiente'],
  }

  if (rol !== 'admin') {
    if (!esComprador && !esVendedor) { res.status(403).json({ error: 'No tienes acceso a esta orden' }); return }
    const permitidos = rol === 'vendedor' && esVendedor
      ? transicionesPermitidas['vendedor']
      : transicionesPermitidas['comprador']
    if (!permitidos.includes(estado)) {
      res.status(403).json({ error: `No puedes cambiar a estado '${estado}'` }); return
    }
    const origenRequerido = estadosOrigenPermitidos[estado]
    if (origenRequerido && !origenRequerido.includes(orden.estado)) {
      res.status(400).json({ error: `La orden debe estar en estado '${origenRequerido.join(' o ')}' para este cambio` }); return
    }
  }

  const actualizada = await prisma.orden.update({
    where: { id_orden: req.params['id'] },
    data: { estado: estado as 'pendiente' | 'pagada' | 'en_entrega' | 'completada' | 'cancelada' },
  })

  // Notificar al comprador (WebSocket + email)
  getIO()?.to(`user:${orden.id_comprador}`).emit('orden_actualizada', {
    id_orden: orden.id_orden,
    estado,
  })

  if (['pagada', 'en_entrega', 'completada', 'cancelada'].includes(estado)) {
    prisma.usuario.findUnique({ where: { id_usuario: orden.id_comprador }, select: { nombre: true, email: true } })
      .then(c => {
        if (c) enviarCambioEstadoOrden(c.nombre, c.email, estado, orden.id_orden)
          .catch(e => console.error('[email estado_orden]', e))
      })
      .catch(() => {})
  }

  // Si se cancela, restaurar stock
  if (estado === 'cancelada') {
    for (const item of orden.items) {
      await prisma.producto.updateMany({
        where: { id_producto: item.id_producto, stock: { not: null } },
        data: { stock: { increment: item.cantidad } },
      })
    }
  }

  res.json({ data: actualizada })
})

export default router
