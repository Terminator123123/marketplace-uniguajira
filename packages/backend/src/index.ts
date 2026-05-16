import 'dotenv/config'
import http from 'http'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import productosRouter from './routes/productos.js'
import ordenesRouter from './routes/ordenes.js'
import tiendasRouter from './routes/tiendas.js'
import solicitudesRouter from './routes/solicitudes.js'
import uploadsRouter from './routes/uploads.js'
import mensajesRouter from './routes/mensajes.js'
import resenasRouter from './routes/resenas.js'
import favoritosRouter from './routes/favoritos.js'
import webhooksRouter from './routes/webhooks.js'
import { initSocket } from './socket.js'

const app = express()
const PORT = process.env['PORT'] ?? 3001
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'

app.use(helmet())
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/productos', productosRouter)
app.use('/api/ordenes', ordenesRouter)
app.use('/api/tiendas', tiendasRouter)
app.use('/api/solicitudes', solicitudesRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/mensajes', mensajesRouter)
app.use('/api/resenas', resenasRouter)
app.use('/api/favoritos', favoritosRouter)
app.use('/webhooks', webhooksRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// Error global — captura cualquier excepción no manejada en routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message, err.stack)
  const status = (err as NodeJS.ErrnoException & { status?: number }).status ?? 500
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : err.message })
})

const httpServer = http.createServer(app)
initSocket(httpServer, FRONTEND_URL)

httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  console.log(`WebSocket listo en ws://localhost:${PORT}`)
})

export default app
