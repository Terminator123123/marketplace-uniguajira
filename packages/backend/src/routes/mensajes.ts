import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// GET /api/mensajes/:id_orden — historial de chat de una orden
router.get('/:id_orden', requireAuth, async (req: AuthRequest, res) => {
  const { id_orden } = req.params
  const userId = req.user!.id

  // Verificar que el usuario sea comprador o vendedor de la orden
  const orden = await prisma.orden.findUnique({
    where: { id_orden },
    include: {
      items: {
        take: 1,
        include: { producto: { select: { id_vendedor: true } } },
      },
    },
  })

  if (!orden) {
    res.status(404).json({ error: 'Orden no encontrada' })
    return
  }

  const vendedorId = orden.items[0]?.producto.id_vendedor
  const esParticipante = orden.id_comprador === userId || vendedorId === userId

  if (!esParticipante && req.user!.rol !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado' })
    return
  }

  const mensajes = await prisma.mensaje.findMany({
    where: { id_orden },
    include: {
      remitente: { select: { id_usuario: true, nombre: true, foto_url: true } },
    },
    orderBy: { created_at: 'asc' },
  })

  // Marcar como leídos los mensajes que no son del usuario actual
  await prisma.mensaje.updateMany({
    where: { id_orden, leido: false, id_remitente: { not: userId } },
    data: { leido: true },
  })

  res.json({ data: mensajes })
})

export default router
