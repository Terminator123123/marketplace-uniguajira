import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { enviarBienvenida, enviarRecuperacion, enviarVerificacion } from '../services/email.js'
import { getPermisosDeRol } from '../middleware/permissions.js'

const router = Router()
const prisma = new PrismaClient()

const DOMINIO = '@uniguajira.edu.co'
const ALLOW_ANY_EMAIL = process.env['ALLOW_ANY_EMAIL'] === 'true'
const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15

// Rate limit estricto para rutas de auth (independiente del global)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Política de contraseñas (mínimo 16 caracteres + complejidad) ─────────────

const passwordSchema = z
  .string()
  .min(16, 'La contraseña debe tener al menos 16 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo (!@#$%^&* etc.)')

const RegisterSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: ALLOW_ANY_EMAIL
    ? z.string().email()
    : z.string().email().endsWith(DOMINIO, { message: `Solo se permiten correos ${DOMINIO}` }),
  password: passwordSchema,
  facultad: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Registro ─────────────────────────────────────────────────────────────────

router.post('/register', authLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { nombre, email, password, facultad } = parsed.data
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) {
    res.status(409).json({ error: 'Ya existe una cuenta con ese correo' })
    return
  }

  const password_hash = await bcrypt.hash(password, 12)
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password_hash, facultad, rol: 'comprador', activo: false, email_verificado: false },
    select: { id_usuario: true, nombre: true, email: true, rol: true, facultad: true },
  })

  const verToken = crypto.randomBytes(32).toString('hex')
  await prisma.tokenVerificacion.create({
    data: {
      id_usuario: usuario.id_usuario,
      token: verToken,
      expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  enviarVerificacion(nombre, email, verToken).catch(e => console.error('[email verificacion]', e))
  enviarBienvenida(nombre, email).catch(e => console.error('[email bienvenida]', e))

  res.status(201).json({ data: usuario, message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.' })
})

// ─── Login con lockout ────────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' })
    return
  }

  const { email, password } = parsed.data
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  // Siempre responder con el mismo mensaje para no revelar si el email existe
  const credencialesInvalidas = () => res.status(401).json({ error: 'Credenciales incorrectas' })

  if (!usuario) { credencialesInvalidas(); return }

  // Verificar si la cuenta está bloqueada
  if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
    const minutosRestantes = Math.ceil((usuario.bloqueado_hasta.getTime() - Date.now()) / 60000)
    res.status(423).json({
      error: `Cuenta bloqueada por ${minutosRestantes} minuto(s) debido a múltiples intentos fallidos.`,
    })
    return
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash)

  if (!passwordOk) {
    const nuevosIntentos = usuario.intentos_fallidos + 1
    const debeBloquear = nuevosIntentos >= MAX_INTENTOS

    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: {
        intentos_fallidos: nuevosIntentos,
        bloqueado_hasta: debeBloquear
          ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000)
          : undefined,
      },
    })

    if (debeBloquear) {
      res.status(423).json({
        error: `Cuenta bloqueada ${BLOQUEO_MINUTOS} minutos por demasiados intentos fallidos.`,
      })
    } else {
      credencialesInvalidas()
    }
    return
  }

  if (!usuario.activo) {
    res.status(403).json({ error: 'Cuenta pendiente de activación. Verifica tu correo.' })
    return
  }

  // Login exitoso: resetear contador de intentos
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { intentos_fallidos: 0, bloqueado_hasta: null },
  })

  const payload = { id: usuario.id_usuario, rol: usuario.rol }
  const secret = process.env['JWT_SECRET']!
  const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '7d') as jwt.SignOptions['expiresIn']
  const access_token = jwt.sign(payload, secret, { expiresIn })

  res.json({
    data: {
      access_token,
      permisos: getPermisosDeRol(usuario.rol),
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        facultad: usuario.facultad,
        foto_url: usuario.foto_url,
        rating_promedio: Number(usuario.rating_promedio),
      },
    },
  })
})

// ─── Verificación de email ────────────────────────────────────────────────────

router.get('/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Token requerido' })
    return
  }

  const registro = await prisma.tokenVerificacion.findUnique({ where: { token } })
  if (!registro || registro.expira_en < new Date()) {
    res.status(400).json({ error: 'El enlace no es válido o ya expiró' })
    return
  }

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id_usuario: registro.id_usuario },
      data: { activo: true, email_verificado: true },
    }),
    prisma.tokenVerificacion.delete({ where: { id: registro.id } }),
  ])

  res.json({ message: 'Correo verificado. Ya puedes iniciar sesión.' })
})

// ─── Reenviar verificación ────────────────────────────────────────────────────

router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email requerido' })
    return
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario || usuario.email_verificado) {
    res.json({ message: 'Si el correo existe y no está verificado, recibirás un nuevo enlace.' })
    return
  }

  await prisma.tokenVerificacion.deleteMany({ where: { id_usuario: usuario.id_usuario } })

  const verToken = crypto.randomBytes(32).toString('hex')
  await prisma.tokenVerificacion.create({
    data: {
      id_usuario: usuario.id_usuario,
      token: verToken,
      expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  enviarVerificacion(usuario.nombre, usuario.email, verToken).catch(e => console.error('[email verificacion]', e))
  res.json({ message: 'Si el correo existe y no está verificado, recibirás un nuevo enlace.' })
})

// ─── Recuperación de contraseña ───────────────────────────────────────────────

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email requerido' })
    return
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    res.json({ message: 'Si el correo existe, recibirás un enlace en breve.' })
    return
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expira_en = new Date(Date.now() + 30 * 60 * 1000)

  await prisma.tokenRecuperacion.create({
    data: { id_usuario: usuario.id_usuario, token, expira_en },
  })

  enviarRecuperacion(usuario.nombre, usuario.email, token).catch(e => console.error('[email recuperacion]', e))
  res.json({ message: 'Si el correo existe, recibirás un enlace en breve.' })
})

// ─── Resetear contraseña ──────────────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const ResetSchema = z.object({
    token: z.string().min(1),
    password: passwordSchema,
  })
  const parsed = ResetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    return
  }

  const { token, password } = parsed.data
  const registro = await prisma.tokenRecuperacion.findUnique({ where: { token } })

  if (!registro || registro.usado || registro.expira_en < new Date()) {
    res.status(400).json({ error: 'El enlace no es válido o ya expiró' })
    return
  }

  const password_hash = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id_usuario: registro.id_usuario },
      // Resetear también el lockout al cambiar contraseña
      data: { password_hash, intentos_fallidos: 0, bloqueado_hasta: null },
    }),
    prisma.tokenRecuperacion.update({
      where: { id: registro.id },
      data: { usado: true },
    }),
  ])

  res.json({ message: 'Contraseña actualizada correctamente.' })
})

// ─── Info del token (permisos para el frontend) ───────────────────────────────

router.get('/permisos/:rol', (req, res) => {
  const { rol } = req.params
  if (!['comprador', 'vendedor', 'admin'].includes(rol)) {
    res.status(400).json({ error: 'Rol inválido' }); return
  }
  res.json({ data: getPermisosDeRol(rol as 'comprador' | 'vendedor' | 'admin') })
})

export default router
