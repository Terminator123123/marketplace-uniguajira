import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Solo se permiten imágenes'))
  },
})

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<{ url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }] },
      (error, result) => {
        if (error || !result) reject(error)
        else resolve({ url: result.secure_url, public_id: result.public_id })
      }
    ).end(buffer)
  })
}

// Subir imagen a un producto
router.post('/producto/:id/imagenes', requireAuth, requireRole('vendedor', 'admin'), upload.single('imagen'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'No se recibió ninguna imagen' }); return }

  const producto = await prisma.producto.findUnique({ where: { id_producto: req.params['id'] } })
  if (!producto || (req.user!.rol === 'vendedor' && producto.id_vendedor !== req.user!.id)) {
    res.status(404).json({ error: 'Producto no encontrado' }); return
  }

  const { url, public_id } = await uploadToCloudinary(req.file.buffer, 'marketplace/productos')

  const totalImagenes = await prisma.imagenProducto.count({ where: { id_producto: producto.id_producto } })
  const imagen = await prisma.imagenProducto.create({
    data: {
      id_producto: producto.id_producto,
      url,
      public_id,
      orden: totalImagenes,
      es_principal: totalImagenes === 0,
    },
  })

  res.status(201).json({ data: imagen })
})

// Subir logo de tienda
router.post('/tienda/logo', requireAuth, requireRole('vendedor', 'admin'), upload.single('imagen'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'No se recibió ninguna imagen' }); return }

  const tienda = await prisma.tienda.findUnique({ where: { id_vendedor: req.user!.id } })
  if (!tienda) { res.status(404).json({ error: 'No tienes tienda' }); return }

  const { url } = await uploadToCloudinary(req.file.buffer, 'marketplace/tiendas/logos')
  const actualizada = await prisma.tienda.update({
    where: { id_tienda: tienda.id_tienda },
    data: { logo_url: url },
  })
  res.json({ data: { logo_url: actualizada.logo_url } })
})

// Subir banner de tienda
router.post('/tienda/banner', requireAuth, requireRole('vendedor', 'admin'), upload.single('imagen'), async (req: AuthRequest, res) => {
  if (!req.file) { res.status(400).json({ error: 'No se recibió ninguna imagen' }); return }

  const tienda = await prisma.tienda.findUnique({ where: { id_vendedor: req.user!.id } })
  if (!tienda) { res.status(404).json({ error: 'No tienes tienda' }); return }

  const { url } = await uploadToCloudinary(req.file.buffer, 'marketplace/tiendas/banners')
  const actualizada = await prisma.tienda.update({
    where: { id_tienda: tienda.id_tienda },
    data: { banner_url: url },
  })
  res.json({ data: { banner_url: actualizada.banner_url } })
})

// Eliminar imagen
router.delete('/imagenes/:id', requireAuth, requireRole('vendedor', 'admin'), async (req: AuthRequest, res) => {
  const imagen = await prisma.imagenProducto.findUnique({ where: { id_imagen: req.params['id'] }, include: { producto: true } })
  if (!imagen) { res.status(404).json({ error: 'Imagen no encontrada' }); return }
  if (req.user!.rol === 'vendedor' && imagen.producto.id_vendedor !== req.user!.id) {
    res.status(403).json({ error: 'No tienes permiso' }); return
  }

  if (imagen.public_id) {
    await cloudinary.uploader.destroy(imagen.public_id).catch(() => {})
  }
  await prisma.imagenProducto.delete({ where: { id_imagen: req.params['id'] } })

  if (imagen.es_principal) {
    const siguiente = await prisma.imagenProducto.findFirst({ where: { id_producto: imagen.id_producto }, orderBy: { orden: 'asc' } })
    if (siguiente) await prisma.imagenProducto.update({ where: { id_imagen: siguiente.id_imagen }, data: { es_principal: true } })
  }

  res.json({ message: 'Imagen eliminada' })
})

export default router
