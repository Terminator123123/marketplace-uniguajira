import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'
import { validateUUID } from '../middleware/security.js'
import { calcularFirmaWompi } from '../services/wompi.js'

const router = Router()
const prisma = new PrismaClient()

// Datos para el widget de Wompi (firma calculada en backend para proteger el secret)
router.get('/checkout-data/:id', validateUUID('id'), requireAuth, async (req: AuthRequest, res) => {
  const orden = await prisma.orden.findUnique({ where: { id_orden: req.params['id'] } })

  if (!orden) { res.status(404).json({ error: 'Orden no encontrada' }); return }
  if (orden.id_comprador !== req.user!.id) { res.status(403).json({ error: 'Acceso denegado' }); return }
  if (orden.estado !== 'pendiente') { res.status(400).json({ error: 'Esta orden ya fue procesada' }); return }

  const amountInCents = Math.round(Number(orden.total) * 100)
  const firma = calcularFirmaWompi(orden.id_orden, amountInCents)
  const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'

  res.json({
    data: {
      publicKey: process.env['WOMPI_PUBLIC_KEY'] ?? '',
      amountInCents,
      reference: orden.id_orden,
      currency: 'COP',
      firma,
      redirectUrl: `${FRONTEND_URL}/pago/resultado`,
    },
  })
})

const CuentaBancariaSchema = z.object({
  banco_nombre: z.string().min(2).max(100),
  tipo_cuenta:  z.enum(['AHORROS', 'CORRIENTE']),
  numero:       z.string().min(4).max(25),
  tipo_doc:     z.enum(['CC', 'NIT', 'CE', 'PPN']),
  numero_doc:   z.string().min(4).max(20),
  titular:      z.string().min(2).max(150),
  email:        z.string().email().max(150),
})

// Obtener cuenta bancaria del vendedor
router.get('/mi-cuenta-bancaria', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id_vendedor: req.user!.id },
  })
  res.json({ data: cuenta })
})

// Guardar / actualizar cuenta bancaria
router.put('/mi-cuenta-bancaria', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const parsed = CuentaBancariaSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const cuenta = await prisma.cuentaBancaria.upsert({
    where: { id_vendedor: req.user!.id },
    create: { id_vendedor: req.user!.id, ...parsed.data },
    update: { ...parsed.data },
  })

  res.json({ data: cuenta })
})

export default router
