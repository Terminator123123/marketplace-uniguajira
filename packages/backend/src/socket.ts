import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import type { UserRole } from '@marketplace/shared'

const prisma = new PrismaClient()

interface SocketUser {
  id: string
  rol: UserRole
}

export function initSocket(httpServer: HttpServer, frontendUrl: string) {
  const io = new SocketServer(httpServer, {
    cors: { origin: frontendUrl, credentials: true },
    path: '/socket.io',
  })

  // Auth middleware — verifica JWT antes de conectar
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined
    if (!token) {
      next(new Error('Token requerido'))
      return
    }
    try {
      const secret = process.env['JWT_SECRET']!
      const payload = jwt.verify(token, secret) as SocketUser
      socket.data['user'] = payload
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data['user'] as SocketUser

    // Unirse a sala de una orden
    socket.on('join_order', async (id_orden: string) => {
      const orden = await prisma.orden.findUnique({
        where: { id_orden },
        include: {
          items: { take: 1, include: { producto: { select: { id_vendedor: true } } } },
        },
      })

      if (!orden) {
        socket.emit('error', { message: 'Orden no encontrada' })
        return
      }

      const vendedorId = orden.items[0]?.producto.id_vendedor
      const esParticipante = orden.id_comprador === user.id || vendedorId === user.id

      if (!esParticipante && user.rol !== 'admin') {
        socket.emit('error', { message: 'Acceso denegado a esta orden' })
        return
      }

      const room = `orden:${id_orden}`
      socket.join(room)
      socket.emit('joined', { id_orden })
    })

    // Enviar mensaje
    socket.on('send_message', async (payload: { id_orden: string; contenido: string }) => {
      const { id_orden, contenido } = payload

      if (!contenido || typeof contenido !== 'string' || contenido.trim().length === 0) {
        socket.emit('error', { message: 'Mensaje vacío' })
        return
      }
      if (contenido.length > 1000) {
        socket.emit('error', { message: 'Mensaje demasiado largo (máx. 1000 caracteres)' })
        return
      }

      const room = `orden:${id_orden}`
      if (!socket.rooms.has(room)) {
        socket.emit('error', { message: 'No estás en esta sala' })
        return
      }

      const orden = await prisma.orden.findUnique({
        where: { id_orden },
        include: {
          items: { take: 1, include: { producto: { select: { id_vendedor: true } } } },
        },
      })

      if (!orden) {
        socket.emit('error', { message: 'Orden no encontrada' })
        return
      }

      const vendedorId = orden.items[0]?.producto.id_vendedor
      const esParticipante = orden.id_comprador === user.id || vendedorId === user.id

      if (!esParticipante && user.rol !== 'admin') {
        socket.emit('error', { message: 'Acceso denegado' })
        return
      }

      const mensaje = await prisma.mensaje.create({
        data: { id_orden, id_remitente: user.id, contenido: contenido.trim() },
        include: {
          remitente: { select: { id_usuario: true, nombre: true, foto_url: true } },
        },
      })

      io.to(room).emit('new_message', mensaje)
    })

    // Marcar mensajes como leídos
    socket.on('mark_read', async (id_orden: string) => {
      await prisma.mensaje.updateMany({
        where: { id_orden, leido: false, id_remitente: { not: user.id } },
        data: { leido: true },
      })
      const room = `orden:${id_orden}`
      socket.to(room).emit('messages_read', { id_orden, leido_por: user.id })
    })

    socket.on('leave_order', (id_orden: string) => {
      socket.leave(`orden:${id_orden}`)
    })
  })

  return io
}
