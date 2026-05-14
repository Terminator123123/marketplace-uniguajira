import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'

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

  const orden = await prisma.orden.create({
    data: {
      id_comprador: req.user!.id,
      total,
      metodo_pago,
      items: { create: itemsConPrecio },
    },
    include: { items: true },
  })

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

// Detalle de orden
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const orden = await prisma.orden.findUnique({
    where: { id_orden: req.params['id'] },
    include: { items: { include: { producto: true } } },
  })

  if (!orden || orden.id_comprador !== req.user!.id) {
    res.status(404).json({ error: 'Orden no encontrada' }); return
  }

  res.json({ data: orden })
})

export default router
