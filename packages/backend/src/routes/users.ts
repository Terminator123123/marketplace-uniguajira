import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id_usuario: req.user!.id },
    select: {
      id_usuario: true, nombre: true, email: true, rol: true,
      facultad: true, bio: true, foto_url: true, rating_promedio: true,
      activo: true, created_at: true,
    },
  })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  res.json({ data: usuario })
})

router.put('/me', requireAuth, async (req: AuthRequest, res) => {
  const { nombre, bio, facultad } = req.body
  const usuario = await prisma.usuario.update({
    where: { id_usuario: req.user!.id },
    data: { nombre, bio, facultad },
    select: { id_usuario: true, nombre: true, bio: true, facultad: true, foto_url: true },
  })
  res.json({ data: usuario })
})

// Admin: activar usuario
router.patch('/:id/activar', requireAuth, requireRole('admin'), async (req, res) => {
  const usuario = await prisma.usuario.update({
    where: { id_usuario: req.params['id'] },
    data: { activo: true },
    select: { id_usuario: true, nombre: true, activo: true },
  })
  res.json({ data: usuario, message: 'Usuario activado' })
})

export default router
