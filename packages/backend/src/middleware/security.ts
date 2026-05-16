import rateLimit from 'express-rate-limit'
import { type Request, type Response, type NextFunction } from 'express'
import type { AuthRequest } from './auth.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Valida que los parámetros de ruta indicados sean UUIDs válidos.
// Previene que strings arbitrarios lleguen a Prisma y expongan errores del schema.
export function validateUUID(...params: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const param of params) {
      const val = req.params[param]
      if (val !== undefined && !UUID_RE.test(val)) {
        res.status(400).json({ error: 'ID inválido' })
        return
      }
    }
    next()
  }
}

// Rate limit por usuario autenticado (no por IP, que es evadible con VPN).
// Los usuarios no autenticados siguen usando IP como fallback.
export const userRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera un momento.' },
})
