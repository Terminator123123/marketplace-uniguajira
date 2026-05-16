import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(token: string) {
  if (socket?.connected) return socket

  const url = import.meta.env['VITE_API_URL'] ?? ''
  socket = io(url || window.location.origin, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket() {
  return socket
}
