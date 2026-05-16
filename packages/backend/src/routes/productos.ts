import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'
import { validateUUID } from '../middleware/security.js'

const router = Router()
const prisma = new PrismaClient()

const ProductoSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  tipo: z.enum(['fisico', 'servicio']),
  categoria: z.string().min(2).max(50),
  stock: z.number().int().nonnegative().optional(),
  activo: z.boolean().optional(),
})

// Listar productos con filtros
router.get('/', async (req, res) => {
  const { tipo, categoria, precio_min, precio_max, busqueda, page = '1', limit = '20' } = req.query

  const where: Record<string, unknown> = { activo: true }
  if (tipo) where['tipo'] = tipo
  if (categoria) where['categoria'] = categoria
  if (precio_min || precio_max) {
    where['precio'] = {
      ...(precio_min ? { gte: Number(precio_min) } : {}),
      ...(precio_max ? { lte: Number(precio_max) } : {}),
    }
  }
  if (busqueda) {
    where['OR'] = [
      { nombre: { contains: String(busqueda), mode: 'insensitive' } },
      { descripcion: { contains: String(busqueda), mode: 'insensitive' } },
    ]
  }

  const pageNum = Math.max(1, Number(page))
  const limitNum = Math.min(50, Number(limit))
  const skip = (pageNum - 1) * limitNum

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { created_at: 'desc' },
      include: {
        imagenes: { where: { es_principal: true }, take: 1 },
        tienda: { select: { nombre_tienda: true, id_tienda: true } },
      },
    }),
    prisma.producto.count({ where }),
  ])

  res.json({ data: productos, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) })
})

// Detalle de producto
router.get('/:id', validateUUID('id'), async (req, res) => {
  const producto = await prisma.producto.findUnique({
    where: { id_producto: req.params['id'], activo: true },
    include: {
      imagenes: { orderBy: { orden: 'asc' } },
      tienda: { select: { nombre_tienda: true, id_tienda: true } },
      resenas: { take: 5, orderBy: { created_at: 'desc' }, include: { comprador: { select: { nombre: true, foto_url: true } } } },
    },
  })

  if (!producto) { res.status(404).json({ error: 'Producto no encontrado' }); return }

  await prisma.producto.update({ where: { id_producto: req.params['id'] }, data: { vistas: { increment: 1 } } })

  res.json({ data: producto })
})

// Crear producto (solo vendedores)
router.post('/', requireAuth, requireRole('vendedor'), async (req: AuthRequest, res) => {
  const parsed = ProductoSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const tienda = await prisma.tienda.findUnique({ where: { id_vendedor: req.user!.id } })
  if (!tienda || tienda.estado !== 'activa') {
    res.status(403).json({ error: 'Necesitas una tienda activa para publicar productos' })
    return
  }

  const producto = await prisma.producto.create({
    data: { ...parsed.data, id_tienda: tienda.id_tienda, id_vendedor: req.user!.id },
  })

  res.status(201).json({ data: producto })
})

// Editar producto
router.put('/:id', validateUUID('id'), requireAuth, requireRole('vendedor'), async (req: AuthRequest, res) => {
  const producto = await prisma.producto.findUnique({ where: { id_producto: req.params['id'] } })
  if (!producto || producto.id_vendedor !== req.user!.id) {
    res.status(404).json({ error: 'Producto no encontrado' }); return
  }

  const parsed = ProductoSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Datos inválidos' }); return }

  const actualizado = await prisma.producto.update({
    where: { id_producto: req.params['id'] },
    data: parsed.data,
  })
  res.json({ data: actualizado })
})

// Categorías disponibles (distinct de productos activos)
router.get('/categorias/lista', async (_req, res) => {
  const cats = await prisma.producto.findMany({
    where: { activo: true },
    select: { categoria: true },
    distinct: ['categoria'],
    orderBy: { categoria: 'asc' },
  })
  res.json({ data: cats.map(c => c.categoria) })
})

// Eliminar producto
router.delete('/:id', validateUUID('id'), requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const producto = await prisma.producto.findUnique({ where: { id_producto: req.params['id'] } })
  if (!producto) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  if (req.user!.rol === 'vendedor' && producto.id_vendedor !== req.user!.id) {
    res.status(403).json({ error: 'No tienes permiso' }); return
  }

  await prisma.producto.update({ where: { id_producto: req.params['id'] }, data: { activo: false } })
  res.json({ message: 'Producto eliminado' })
})

export default router
