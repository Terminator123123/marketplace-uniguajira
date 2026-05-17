import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { getIO } from '../socket.js'
import { enviarCambioEstadoOrden } from '../services/email.js'

const router = Router()
const prisma = new PrismaClient()

// Wompi webhook — verifica firma HMAC y actualiza orden
// Docs: https://docs.wompi.co/docs/colombia/webhooks
router.post('/wompi', async (req: Request, res: Response) => {
  const body = req.body as WompiEvent

  // Verificar firma
  const eventsKey = process.env['WOMPI_EVENTS_KEY']
  if (eventsKey) {
    const { properties, checksum } = body.signature ?? {}
    if (!properties || !checksum) {
      res.status(400).json({ error: 'Firma inválida' })
      return
    }

    // Construir cadena: valor de cada propiedad + timestamp + key
    const valores = properties.map(prop => {
      const partes = prop.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let val: any = body.data
      for (const p of partes) val = val?.[p]
      return String(val ?? '')
    })
    const cadena = [...valores, body.timestamp, eventsKey].join('')
    const firma = crypto.createHash('sha256').update(cadena).digest('hex')

    if (firma !== checksum) {
      res.status(401).json({ error: 'Firma no válida' })
      return
    }
  } else {
    console.warn('[webhook wompi] WOMPI_EVENTS_KEY no configurada — saltando verificación de firma')
  }

  const tx = body.data?.transaction
  if (!tx) { res.sendStatus(200); return }

  // La referencia de pago es el id_orden que el frontend envió a Wompi
  const referencia = tx.reference
  const estado = tx.status // 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR'

  const orden = await prisma.orden.findFirst({
    where: { id_orden: referencia },
    include: { items: { include: { producto: { select: { id_vendedor: true } } } } },
  })

  if (!orden) { res.sendStatus(200); return }

  // Idempotencia: si ya está en el estado final correcto, no hacer nada
  if (estado === 'APPROVED' && orden.estado === 'pagada') { res.sendStatus(200); return }
  if (['DECLINED', 'VOIDED', 'ERROR'].includes(estado) && orden.estado === 'cancelada') { res.sendStatus(200); return }

  if (estado === 'APPROVED') {
    await prisma.$transaction(async prismaTx => {
      await prismaTx.orden.update({
        where: { id_orden: orden.id_orden },
        data: { estado: 'pagada', referencia_pago: tx.id },
      })

      for (const item of orden.items) {
        await prismaTx.producto.updateMany({
          where: { id_producto: item.id_producto, stock: { not: null } },
          data: { stock: { decrement: item.cantidad } },
        })
      }
    })
    console.log('[wompi] Orden pagada:', orden.id_orden)

    // Notificar al comprador (WebSocket + email)
    const io = getIO()
    io?.to(`user:${orden.id_comprador}`).emit('orden_actualizada', {
      id_orden: orden.id_orden,
      estado: 'pagada',
    })

    // Notificar a cada vendedor de la orden
    const vendedores = new Set(orden.items.map(i => i.producto?.id_vendedor).filter(Boolean))
    for (const vendedorId of vendedores) {
      io?.to(`user:${vendedorId}`).emit('orden_pagada', {
        id_orden: orden.id_orden,
        total: Number(orden.total),
      })
    }

    // Email al comprador
    prisma.usuario.findUnique({ where: { id_usuario: orden.id_comprador }, select: { nombre: true, email: true } })
      .then(c => {
        if (c) enviarCambioEstadoOrden(c.nombre, c.email, 'pagada', orden.id_orden)
          .catch(e => console.error('[email estado_orden]', e))
      })
      .catch(() => {})

  } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(estado)) {
    await prisma.orden.update({
      where: { id_orden: orden.id_orden },
      data: { estado: 'cancelada' },
    })
    console.log('[wompi] Orden cancelada por pago fallido:', orden.id_orden, estado)

    getIO()?.to(`user:${orden.id_comprador}`).emit('orden_actualizada', {
      id_orden: orden.id_orden,
      estado: 'cancelada',
    })
  }

  res.sendStatus(200)
})

interface WompiEvent {
  event: string
  data: {
    transaction: {
      id: string
      status: string
      reference: string
      amount_in_cents: number
      currency: string
      payment_method_type: string
    }
  }
  signature: {
    properties: string[]
    checksum: string
  }
  timestamp: number
  sent_at: string
}

export default router
