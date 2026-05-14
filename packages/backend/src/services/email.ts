import { Resend } from 'resend'

const resend = new Resend(process.env['RESEND_API_KEY'])
const FROM = process.env['EMAIL_FROM'] ?? 'onboarding@resend.dev'

async function send(payload: Parameters<typeof resend.emails.send>[0]) {
  const { data, error } = await resend.emails.send(payload)
  if (error) {
    console.error('[Resend error]', error)
  } else {
    console.log('[Resend ok] id:', data?.id, '→', payload.to)
  }
}

export async function enviarBienvenida(nombre: string, email: string) {
  await send({
    from: FROM,
    to: email,
    subject: '¡Bienvenido al Marketplace Uniguajira!',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#15803d">¡Hola, ${nombre}!</h2>
        <p>Tu cuenta en el <strong>Marketplace Uniguajira</strong> ha sido creada exitosamente.</p>
        <p>Ya puedes explorar el catálogo y comprar productos de tus compañeros.</p>
        <a href="http://localhost:5173/catalogo" style="display:inline-block;background:#15803d;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px">
          Ver catálogo
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Universidad de La Guajira · Marketplace Uniguajira</p>
      </div>
    `,
  })
}

export async function enviarRecuperacion(nombre: string, email: string, token: string) {
  const link = `http://localhost:5173/reset-password?token=${token}`
  await send({
    from: FROM,
    to: email,
    subject: 'Recupera tu contraseña — Marketplace Uniguajira',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#15803d">Recuperar contraseña</h2>
        <p>Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el botón para crear una nueva contraseña. El enlace expira en <strong>30 minutos</strong>.</p>
        <a href="${link}" style="display:inline-block;background:#15803d;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px">
          Restablecer contraseña
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">Si no solicitaste esto, ignora este correo.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Universidad de La Guajira · Marketplace Uniguajira</p>
      </div>
    `,
  })
}

export async function enviarVerificacion(nombre: string, email: string, token: string) {
  const link = `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/verificar-email?token=${token}`
  await send({
    from: FROM,
    to: email,
    subject: 'Verifica tu correo — Marketplace Uniguajira',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#15803d">Verifica tu correo</h2>
        <p>Hola <strong>${nombre}</strong>, confirma que este correo es tuyo para activar tu cuenta.</p>
        <p>El enlace expira en <strong>24 horas</strong>.</p>
        <a href="${link}" style="display:inline-block;background:#15803d;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px">
          Verificar correo
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">Si no creaste esta cuenta, ignora este correo.</p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Universidad de La Guajira · Marketplace Uniguajira</p>
      </div>
    `,
  })
}

export async function enviarSolicitudAprobada(nombre: string, email: string, rol: string) {
  await send({
    from: FROM,
    to: email,
    subject: `Tu solicitud de ${rol} fue aprobada — Marketplace Uniguajira`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#15803d">¡Solicitud aprobada! 🎉</h2>
        <p>Hola <strong>${nombre}</strong>, tu solicitud para ser <strong>${rol}</strong> en el Marketplace Uniguajira fue aprobada.</p>
        <a href="http://localhost:5173/dashboard" style="display:inline-block;background:#15803d;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px">
          Ir a mi dashboard
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Universidad de La Guajira · Marketplace Uniguajira</p>
      </div>
    `,
  })
}
