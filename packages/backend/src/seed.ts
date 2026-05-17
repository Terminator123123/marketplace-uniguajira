import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = (pwd: string) => bcrypt.hash(pwd, 12)

  // ─── Admin ────────────────────────────────────────────────────────────────

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@uniguajira.edu.co' },
    update: { email_verificado: true, activo: true, password_hash: await hash('Admin_Marketplace2026!'), intentos_fallidos: 0, bloqueado_hasta: null },
    create: {
      nombre: 'Administrador',
      email: 'admin@uniguajira.edu.co',
      password_hash: await hash('Admin_Marketplace2026!'),
      rol: 'admin',
      facultad: 'Sistemas',
      activo: true,
      email_verificado: true,
    },
  })

  // ─── Vendedor de prueba ───────────────────────────────────────────────────

  const vendedor = await prisma.usuario.upsert({
    where: { email: 'vendedor@uniguajira.edu.co' },
    update: { email_verificado: true, activo: true, password_hash: await hash('Vendedor_Marketplace2026!'), intentos_fallidos: 0, bloqueado_hasta: null },
    create: {
      nombre: 'Carlos Vendedor',
      email: 'vendedor@uniguajira.edu.co',
      password_hash: await hash('Vendedor_Marketplace2026!'),
      rol: 'vendedor',
      facultad: 'Ingeniería',
      bio: 'Emprendedor de prueba',
      activo: true,
      email_verificado: true,
    },
  })

  await prisma.tienda.upsert({
    where: { id_vendedor: vendedor.id_usuario },
    update: {},
    create: {
      id_vendedor: vendedor.id_usuario,
      nombre_tienda: 'Tienda de Prueba',
      descripcion: 'Tienda de ejemplo con productos variados',
      estado: 'activa',
    },
  })

  // ─── Comprador de prueba ──────────────────────────────────────────────────

  const comprador = await prisma.usuario.upsert({
    where: { email: 'comprador@uniguajira.edu.co' },
    update: { email_verificado: true, activo: true, password_hash: await hash('Comprador_Marketplace2026!'), intentos_fallidos: 0, bloqueado_hasta: null },
    create: {
      nombre: 'Ana Compradora',
      email: 'comprador@uniguajira.edu.co',
      password_hash: await hash('Comprador_Marketplace2026!'),
      rol: 'comprador',
      facultad: 'Derecho',
      activo: true,
      email_verificado: true,
    },
  })

  // ─── Cuenta tester (para amigo externo) ──────────────────────────────────

  const tester = await prisma.usuario.upsert({
    where: { email: 'tester@uniguajira.edu.co' },
    update: { email_verificado: true, activo: true, password_hash: await hash('Tester_Marketplace2026!'), intentos_fallidos: 0, bloqueado_hasta: null },
    create: {
      nombre: 'Tester Externo',
      email: 'tester@uniguajira.edu.co',
      password_hash: await hash('Tester_Marketplace2026!'),
      rol: 'comprador',
      facultad: 'Beta Testing',
      activo: true,
      email_verificado: true,
    },
  })

  console.log('\n✅ Seed completado — cuentas disponibles:\n')
  console.log('┌─────────────────────────────────────────────────────────────────────┐')
  console.log('│  ROL        EMAIL                          CONTRASEÑA               │')
  console.log('├─────────────────────────────────────────────────────────────────────┤')
  console.log('│  admin      admin@uniguajira.edu.co        Admin_Marketplace2026!   │')
  console.log('│  vendedor   vendedor@uniguajira.edu.co     Vendedor_Marketplace2026!│')
  console.log('│  comprador  comprador@uniguajira.edu.co    Comprador_Marketplace2026│')
  console.log('│  TESTER     tester@uniguajira.edu.co       Tester_Marketplace2026!  │')
  console.log('└─────────────────────────────────────────────────────────────────────┘')
  console.log(`\n   IDs: admin=${admin.id_usuario}`)
  console.log(`         vendedor=${vendedor.id_usuario}`)
  console.log(`         comprador=${comprador.id_usuario}`)
  console.log(`         tester=${tester.id_usuario}`)
}

main()
  .catch(e => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
