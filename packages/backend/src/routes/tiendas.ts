import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'
import { validateUUID } from '../middleware/security.js'

const router = Router()
const prisma = new PrismaClient()

const TiendaSchema = z.object({
  nombre_tienda: z.string().min(2).max(100),
  descripcion: z.string().optional(),
  ubicacion: z.string().max(300).optional(),
  banner_url: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
})

// Mi tienda (vendedor autenticado)
router.get('/mi-tienda', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const tienda = await prisma.tienda.findUnique({
    where: { id_vendedor: req.user!.id },
    include: { _count: { select: { productos: { where: { activo: true } } } } },
  })
  res.json({ data: tienda })
})

// Crear tienda
router.post('/', requireAuth, requireRole('vendedor'), async (req: AuthRequest, res) => {
  const existe = await prisma.tienda.findUnique({ where: { id_vendedor: req.user!.id } })
  if (existe) { res.status(409).json({ error: 'Ya tienes una tienda creada' }); return }

  const parsed = TiendaSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors }); return }

  const tienda = await prisma.tienda.create({
    data: { ...parsed.data, id_vendedor: req.user!.id },
  })
  res.status(201).json({ data: tienda })
})

// Editar tienda
router.put('/mi-tienda', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const parsed = TiendaSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Datos inválidos' }); return }

  const tienda = await prisma.tienda.update({
    where: { id_vendedor: req.user!.id },
    data: parsed.data,
  })
  res.json({ data: tienda })
})

// Productos de mi tienda
router.get('/mi-tienda/productos', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const tienda = await prisma.tienda.findUnique({ where: { id_vendedor: req.user!.id } })
  if (!tienda) { res.status(404).json({ error: 'No tienes tienda aún' }); return }

  const productos = await prisma.producto.findMany({
    where: { id_tienda: tienda.id_tienda },
    include: { imagenes: { where: { es_principal: true }, take: 1 } },
    orderBy: { created_at: 'desc' },
  })
  res.json({ data: productos })
})

// Admin: listar todas las tiendas
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { estado, buscar, page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, parseInt(limit))

  const where: Record<string, unknown> = {}
  if (estado) where['estado'] = estado
  if (buscar) where['nombre_tienda'] = { contains: buscar, mode: 'insensitive' }

  const [tiendas, total] = await Promise.all([
    prisma.tienda.findMany({
      where,
      include: {
        vendedor: { select: { nombre: true, email: true, facultad: true } },
        _count: { select: { productos: { where: { activo: true } } } },
      },
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.tienda.count({ where }),
  ])

  res.json({ data: tiendas, total, page: pageNum, totalPages: Math.ceil(total / limitNum) })
})

// Admin: cambiar estado de una tienda
router.patch('/:id/estado', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const { estado } = req.body as { estado: string }
  if (!['pendiente', 'activa', 'suspendida'].includes(estado)) {
    res.status(400).json({ error: 'Estado inválido' }); return
  }

  const tienda = await prisma.tienda.update({
    where: { id_tienda: req.params['id'] },
    data: { estado: estado as 'pendiente' | 'activa' | 'suspendida' },
    select: { id_tienda: true, nombre_tienda: true, estado: true },
  })
  res.json({ data: tienda, message: `Tienda ${estado}` })
})

// Tienda pública por id
router.get('/:id', validateUUID('id'), async (req, res) => {
  const tienda = await prisma.tienda.findUnique({
    where: { id_tienda: req.params['id'] },
    include: {
      vendedor: { select: { nombre: true, foto_url: true, rating_promedio: true, facultad: true } },
      productos: {
        where: { activo: true },
        include: { imagenes: { where: { es_principal: true }, take: 1 } },
        orderBy: { created_at: 'desc' },
        take: 20,
      },
    },
  })
  if (!tienda || tienda.estado !== 'activa') { res.status(404).json({ error: 'Tienda no encontrada' }); return }
  res.json({ data: tienda })
})

export default router
