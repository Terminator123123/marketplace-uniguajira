import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const TiendaSchema = z.object({
  nombre_tienda: z.string().min(2).max(100),
  descripcion: z.string().optional(),
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

// Tienda pública por id
router.get('/:id', async (req, res) => {
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
