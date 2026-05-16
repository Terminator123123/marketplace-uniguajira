import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'
import { validateUUID } from '../middleware/security.js'
import { enviarSolicitudAprobada } from '../services/email.js'

const router = Router()
const prisma = new PrismaClient()

const SolicitudSchema = z.object({
  rol_solicitado: z.enum(['vendedor']),
  motivacion: z.string().min(10).max(500).optional(),
})

// Crear solicitud (comprador → vendedor)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  if (req.user!.rol !== 'comprador') {
    res.status(400).json({ error: 'Solo los compradores pueden solicitar cambio de rol' })
    return
  }

  const pendiente = await prisma.solicitudRol.findFirst({
    where: { id_usuario: req.user!.id, estado: 'pendiente' },
  })
  if (pendiente) {
    res.status(409).json({ error: 'Ya tienes una solicitud pendiente de revisión' })
    return
  }

  const parsed = SolicitudSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const solicitud = await prisma.solicitudRol.create({
    data: { id_usuario: req.user!.id, ...parsed.data },
  })
  res.status(201).json({ data: solicitud, message: 'Solicitud enviada. Te notificaremos cuando sea revisada.' })
})

// Mi solicitud activa
router.get('/mi-solicitud', requireAuth, async (req: AuthRequest, res) => {
  const solicitud = await prisma.solicitudRol.findFirst({
    where: { id_usuario: req.user!.id },
    orderBy: { created_at: 'desc' },
  })
  res.json({ data: solicitud })
})

// Admin: listar todas las solicitudes pendientes
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const solicitudes = await prisma.solicitudRol.findMany({
    where: { estado: 'pendiente' },
    include: {
      usuario: { select: { nombre: true, email: true, facultad: true, created_at: true } },
    },
    orderBy: { created_at: 'asc' },
  })
  res.json({ data: solicitudes })
})

// Admin: aprobar o rechazar
router.patch('/:id', validateUUID('id'), requireAuth, requireRole('admin'), async (req, res) => {
  const { decision } = req.body as { decision: 'aprobada' | 'rechazada' }
  if (!['aprobada', 'rechazada'].includes(decision)) {
    res.status(400).json({ error: 'Decisión inválida' }); return
  }

  const solicitud = await prisma.solicitudRol.findUnique({ where: { id_solicitud: req.params['id'] } })
  if (!solicitud || solicitud.estado !== 'pendiente') {
    res.status(404).json({ error: 'Solicitud no encontrada o ya procesada' }); return
  }

  await prisma.solicitudRol.update({
    where: { id_solicitud: req.params['id'] },
    data: { estado: decision },
  })

  if (decision === 'aprobada') {
    await prisma.usuario.update({
      where: { id_usuario: solicitud.id_usuario },
      data: { rol: solicitud.rol_solicitado },
    })
    // Crear tienda automáticamente al aprobar
    const existe = await prisma.tienda.findUnique({ where: { id_vendedor: solicitud.id_usuario } })
    const usuario = await prisma.usuario.findUnique({ where: { id_usuario: solicitud.id_usuario } })
    if (!existe) {
      await prisma.tienda.create({
        data: {
          id_vendedor: solicitud.id_usuario,
          nombre_tienda: `Tienda de ${usuario?.nombre ?? 'vendedor'}`,
          estado: 'activa',
        },
      })
    }
    if (usuario) {
      enviarSolicitudAprobada(usuario.nombre, usuario.email, solicitud.rol_solicitado).catch(e => console.error('[email solicitud]', e))
    }
  }

  res.json({ message: `Solicitud ${decision}` })
})

export default router
