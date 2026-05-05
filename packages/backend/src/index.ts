import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import productosRouter from './routes/productos.js'
import ordenesRouter from './routes/ordenes.js'

const app = express()
const PORT = process.env['PORT'] ?? 3001

app.use(helmet())
app.use(cors({
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/productos', productosRouter)
app.use('/api/ordenes', ordenesRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

export default app
