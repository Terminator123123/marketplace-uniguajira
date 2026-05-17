import crypto from 'crypto'

export function calcularFirmaWompi(
  reference: string,
  amountInCents: number,
  currency: string = 'COP',
): string {
  const secret = process.env['WOMPI_INTEGRITY_SECRET'] ?? ''
  if (!secret) console.warn('[wompi] WOMPI_INTEGRITY_SECRET no configurado')
  const cadena = `${reference}${amountInCents}${currency}${secret}`
  return crypto.createHash('sha256').update(cadena).digest('hex')
}
