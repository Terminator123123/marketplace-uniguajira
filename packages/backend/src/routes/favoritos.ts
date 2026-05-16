import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Mis favoritos
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, parseInt(limit))

  const [favoritos, total] = await Promise.all([
    prisma.favorito.findMany({
      where: { id_usuario: req.user!.id },
      include: {
        producto: {
          include: {
            imagenes: { where: { es_principal: true }, take: 1 },
            tienda: { select: { nombre_tienda: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.favorito.count({ where: { id_usuario: req.user!.id } }),
  ])

  res.json({ data: favoritos.map(f => f.producto), total, page: pageNum, totalPages: Math.ceil(total / limitNum) })
})

// Agregar a favoritos
router.post('/:id_producto', requireAuth, async (req: AuthRequest, res) => {
  const { id_producto } = req.params

  const producto = await prisma.producto.findUnique({ where: { id_producto, activo: true } })
  if (!producto) { res.status(404).json({ error: 'Producto no encontrado' }); return }

  const favorito = await prisma.favorito.upsert({
    where: { id_usuario_id_producto: { id_usuario: req.user!.id, id_producto } },
    create: { id_usuario: req.user!.id, id_producto },
    update: {},
  })

  res.status(201).json({ data: favorito, message: 'Agregado a favoritos' })
})

// Quitar de favoritos
router.delete('/:id_producto', requireAuth, async (req: AuthRequest, res) => {
  const { id_producto } = req.params

  await prisma.favorito.deleteMany({
    where: { id_usuario: req.user!.id, id_producto },
  })

  res.json({ message: 'Eliminado de favoritos' })
})

// Verificar si un producto es favorito
router.get('/check/:id_producto', requireAuth, async (req: AuthRequest, res) => {
  const favorito = await prisma.favorito.findUnique({
    where: { id_usuario_id_producto: { id_usuario: req.user!.id, id_producto: req.params['id_producto'] } },
  })
  res.json({ esFavorito: !!favorito })
})

export default router
