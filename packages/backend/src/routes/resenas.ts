import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const ResenaSchema = z.object({
  id_orden: z.string().uuid(),
  id_producto: z.string().uuid(),
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
})

// Crear reseña — solo el comprador de una orden completada, una vez por producto
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = ResenaSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { id_orden, id_producto, estrellas, comentario } = parsed.data

  const orden = await prisma.orden.findUnique({
    where: { id_orden },
    include: { items: { where: { id_producto } } },
  })

  if (!orden || orden.id_comprador !== req.user!.id) {
    res.status(404).json({ error: 'Orden no encontrada' })
    return
  }
  if (orden.estado !== 'completada') {
    res.status(400).json({ error: 'Solo puedes reseñar órdenes completadas' })
    return
  }
  if (orden.items.length === 0) {
    res.status(400).json({ error: 'El producto no pertenece a esta orden' })
    return
  }

  const existe = await prisma.resena.findUnique({ where: { id_orden_id_producto: { id_orden, id_producto } } })
  if (existe) {
    res.status(409).json({ error: 'Ya dejaste una reseña para este producto en esta orden' })
    return
  }

  const resena = await prisma.resena.create({
    data: { id_orden, id_comprador: req.user!.id, id_producto, estrellas, comentario },
  })

  // Actualizar rating_promedio del vendedor
  const producto = await prisma.producto.findUnique({ where: { id_producto } })
  if (producto) {
    const agg = await prisma.resena.aggregate({
      where: { producto: { id_vendedor: producto.id_vendedor } },
      _avg: { estrellas: true },
    })
    if (agg._avg.estrellas !== null) {
      await prisma.usuario.update({
        where: { id_usuario: producto.id_vendedor },
        data: { rating_promedio: agg._avg.estrellas },
      })
    }
  }

  res.status(201).json({ data: resena })
})

// Listar reseñas de un producto
router.get('/producto/:id', async (req, res) => {
  const { page = '1', limit = '10' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, parseInt(limit))

  const [resenas, total, agg] = await Promise.all([
    prisma.resena.findMany({
      where: { id_producto: req.params['id'] },
      include: { comprador: { select: { nombre: true, foto_url: true } } },
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.resena.count({ where: { id_producto: req.params['id'] } }),
    prisma.resena.aggregate({ where: { id_producto: req.params['id'] }, _avg: { estrellas: true } }),
  ])

  res.json({
    data: resenas,
    total,
    promedio: agg._avg.estrellas ? Number(agg._avg.estrellas.toFixed(2)) : null,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  })
})

// Mis reseñas pendientes (productos comprados en órdenes completadas sin reseña)
router.get('/pendientes', requireAuth, async (req: AuthRequest, res) => {
  const ordenes = await prisma.orden.findMany({
    where: { id_comprador: req.user!.id, estado: 'completada' },
    include: {
      items: {
        include: {
          producto: { select: { id_producto: true, nombre: true, imagenes: { where: { es_principal: true }, take: 1 } } },
        },
      },
      resenas: { select: { id_producto: true } },
    },
  })

  const pendientes = ordenes.flatMap(orden => {
    const resenasProductos = new Set(orden.resenas.map(r => r.id_producto))
    return orden.items
      .filter(item => !resenasProductos.has(item.id_producto))
      .map(item => ({ id_orden: orden.id_orden, producto: item.producto }))
  })

  res.json({ data: pendientes })
})

export default router
