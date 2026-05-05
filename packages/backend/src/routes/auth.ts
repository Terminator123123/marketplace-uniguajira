import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

const DOMINIO = '@uniguajira.edu.co'

const RegisterSchema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email().endsWith(DOMINIO, {
    message: `Solo se permiten correos ${DOMINIO}`,
  }),
  password: z.string().min(8),
  facultad: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/register', async (req, res) => {
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
    data: { nombre, email, password_hash, facultad, rol: 'comprador' },
    select: { id_usuario: true, nombre: true, email: true, rol: true, facultad: true },
  })

  res.status(201).json({ data: usuario, message: 'Cuenta creada. Pendiente de activación.' })
})

router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos inválidos' })
    return
  }

  const { email, password } = parsed.data
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    res.status(401).json({ error: 'Credenciales incorrectas' })
    return
  }

  if (!usuario.activo) {
    res.status(403).json({ error: 'Cuenta pendiente de activación' })
    return
  }

  const payload = { id: usuario.id_usuario, rol: usuario.rol }
  const secret = process.env['JWT_SECRET']!
  const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '15m') as jwt.SignOptions['expiresIn']
  const access_token = jwt.sign(payload, secret, { expiresIn })

  res.json({
    data: {
      access_token,
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

export default router
