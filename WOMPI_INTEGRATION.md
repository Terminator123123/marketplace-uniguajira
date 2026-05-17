# Integración Wompi — Marketplace Uniguajira

> Guía técnica completa para integrar Wompi como pasarela de pagos y sistema de liquidación a vendedores.  
> Última revisión: Mayo 2026

---

## Tabla de contenido

1. [Modelo de flujo de dinero](#1-modelo-de-flujo-de-dinero)
2. [Credenciales y entornos](#2-credenciales-y-entornos)
3. [Flujo 1 — Cobro al comprador (Widget)](#3-flujo-1--cobro-al-comprador-widget)
4. [Flujo 2 — Creación de transacción por API](#4-flujo-2--creación-de-transacción-por-api)
5. [Métodos de pago](#5-métodos-de-pago)
6. [Webhooks — Confirmar pago](#6-webhooks--confirmar-pago)
7. [Flujo 3 — Liquidación al vendedor (Payouts)](#7-flujo-3--liquidación-al-vendedor-payouts)
8. [Comisión de plataforma](#8-comisión-de-plataforma)
9. [Plan de implementación por sprints](#9-plan-de-implementación-por-sprints)
10. [Variables de entorno necesarias](#10-variables-de-entorno-necesarias)

---

## 1. Modelo de flujo de dinero

```
Comprador ──paga──▶ Wompi (retiene 100%)
                        │
                        ├─── Webhook ──▶ Backend Marketplace
                        │                  (marca orden como PAGADA)
                        │
Marketplace ─liquida──▶ Vendedor
   (retiene 15% comisión, transfiere 85% via Payouts API)
```

**Dos APIs de Wompi involucradas:**

| API | Propósito | Cuándo se usa |
|-----|-----------|---------------|
| **Transactions API** | Cobrar al comprador | Al momento del checkout |
| **Payouts API** | Pagar al vendedor | Al completar la orden (o en batch semanal) |

---

## 2. Credenciales y entornos

Obtener desde el [Dashboard de Wompi](https://comercios.wompi.co):

| Variable | Descripción | Uso |
|----------|-------------|-----|
| `WOMPI_PUBLIC_KEY` | `pub_test_...` / `pub_prod_...` | Frontend (Widget) |
| `WOMPI_PRIVATE_KEY` | `prv_test_...` / `prv_prod_...` | Backend (API) |
| `WOMPI_INTEGRITY_SECRET` | Secret para firmas SHA256 | Backend (calcular firma) |
| `WOMPI_EVENTS_SECRET` | Secret para validar webhooks | Backend (validar eventos) |
| `WOMPI_PAYOUTS_API_KEY` | Key para Payouts API | Backend (liquidar vendedores) |
| `WOMPI_PAYOUTS_ACCOUNT_ID` | ID de cuenta origen payouts | Backend (liquidar vendedores) |

**Base URLs:**
```
Sandbox:    https://sandbox.wompi.co/v1
Producción: https://production.wompi.co/v1

Payouts Sandbox:    https://payouts-sandbox.wompi.co/api/v1
Payouts Producción: https://payouts.wompi.co/api/v1
```

---

## 3. Flujo 1 — Cobro al comprador (Widget)

El Widget es la forma más rápida de integrar. Wompi maneja toda la UI del pago.

### 3.1 Calcular la firma de integridad (backend)

**NUNCA calcular en frontend** — expone el `INTEGRITY_SECRET`.

```typescript
// packages/backend/src/services/wompi.ts
import crypto from 'crypto'

export function calcularFirmaWompi(
  reference: string,
  amountInCents: number,
  currency: string = 'COP'
): string {
  const cadena = `${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET}`
  return crypto.createHash('sha256').update(cadena).digest('hex')
}
```

### 3.2 Endpoint para obtener datos del widget (backend)

```typescript
// GET /api/pagos/checkout-data/:ordenId
router.get('/checkout-data/:id', requireAuth, async (req, res) => {
  const orden = await prisma.orden.findUnique({ where: { id_orden: req.params.id } })
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })

  const amountInCents = Math.round(Number(orden.total) * 100)
  const reference = orden.id_orden
  const firma = calcularFirmaWompi(reference, amountInCents)

  res.json({
    publicKey: process.env.WOMPI_PUBLIC_KEY,
    amountInCents,
    reference,
    currency: 'COP',
    firma,
    redirectUrl: `${process.env.FRONTEND_URL}/mis-pedidos/${orden.id_orden}?pago=ok`,
  })
})
```

### 3.3 Renderizar el widget (frontend)

```tsx
// En CheckoutPage.tsx
useEffect(() => {
  if (!checkoutData) return

  const script = document.createElement('script')
  script.src = 'https://checkout.wompi.co/widget.js'
  script.setAttribute('data-render', 'button')
  script.setAttribute('data-public-key', checkoutData.publicKey)
  script.setAttribute('data-currency', 'COP')
  script.setAttribute('data-amount-in-cents', String(checkoutData.amountInCents))
  script.setAttribute('data-reference', checkoutData.reference)
  script.setAttribute('data-signature:integrity', checkoutData.firma)
  script.setAttribute('data-redirect-url', checkoutData.redirectUrl)

  // Datos del cliente (pre-rellenar formulario)
  script.setAttribute('data-customer-data:email', usuario.email)
  script.setAttribute('data-customer-data:full-name', usuario.nombre)

  document.getElementById('wompi-container')?.appendChild(script)
}, [checkoutData])

// En el JSX:
// <div id="wompi-container" />
```

---

## 4. Flujo 2 — Creación de transacción por API

Para más control (sin widget), usar la API directamente.

### 4.1 Obtener acceptance token (requerido)

```typescript
const tokenRes = await fetch(`${WOMPI_BASE}/merchants/${publicKey}`)
const { data } = await tokenRes.json()
const acceptanceToken = data.presigned_acceptance.acceptance_token
```

### 4.2 Crear transacción

```typescript
// POST https://production.wompi.co/v1/transactions
const body = {
  acceptance_token: acceptanceToken,
  amount_in_cents: 4500000, // $45,000 COP
  currency: 'COP',
  customer_email: 'comprador@uniguajira.edu.co',
  reference: 'orden-uuid-aqui',
  signature: firma,                    // SHA256 calculado en backend
  payment_method: { /* ver sección 5 */ },
  redirect_url: 'https://tudominio.com/pago/resultado',
}

const res = await fetch(`${WOMPI_BASE}/transactions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})
```

### 4.3 Consultar estado de transacción

```typescript
// GET /v1/transactions/:id  (usa PUBLIC key)
const res = await fetch(`${WOMPI_BASE}/transactions/${transactionId}`, {
  headers: { 'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}` },
})
// { data: { id, status: 'APPROVED' | 'PENDING' | 'DECLINED' | 'VOIDED' | 'ERROR' } }
```

---

## 5. Métodos de pago

### Nequi
```json
{
  "payment_method": {
    "type": "NEQUI",
    "phone_number": "3107654321"
  }
}
```
> Cliente recibe push notification en su app. Responde en segundos.

### Daviplata
```json
{
  "payment_method": {
    "type": "DAVIPLATA",
    "user_legal_id_type": "CC",
    "user_legal_id": "1000123456",
    "payment_description": "Marketplace Uniguajira"
  }
}
```
> Wompi envía OTP por SMS. Cliente lo ingresa en la interfaz.

### PSE (transferencia bancaria)
```typescript
// Primero obtener lista de bancos:
// GET /v1/pse/financial_institutions

{
  "payment_method": {
    "type": "PSE",
    "user_type": 0,               // 0=persona natural, 1=empresa
    "user_legal_id_type": "CC",
    "user_legal_id": "1000123456",
    "financial_institution_code": "1007", // Bancolombia
    "payment_description": "Pago Marketplace Uniguajira"
  },
  "customer_data": {
    "phone_number": "573107654321",
    "full_name": "Ana García"
  }
}
```

### Tarjeta crédito/débito
```typescript
// Paso 1: Tokenizar tarjeta (llamada desde frontend, usa PUBLIC key)
const tokenRes = await fetch(`${WOMPI_BASE}/tokens/cards`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}` },
  body: JSON.stringify({
    number: '4242424242424242',
    cvc: '123',
    exp_month: '08',
    exp_year: '28',
    card_holder: 'Ana García',
  }),
})
const { data: { id: cardToken } } = await tokenRes.json()

// Paso 2: Usar token en la transacción
{
  "payment_method": {
    "type": "CARD",
    "token": cardToken,
    "installments": 1
  }
}
```
> ⚠️ Nunca almacenar datos de tarjeta. Solo guardar el token si es para pagos recurrentes.

---

## 6. Webhooks — Confirmar pago

### 6.1 Registrar URL en dashboard Wompi

URL a registrar: `https://tu-backend.railway.app/api/pagos/webhook`

### 6.2 Implementar endpoint

```typescript
// packages/backend/src/routes/pagos.ts
import crypto from 'crypto'

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const evento = JSON.parse(req.body.toString())

  // 1. Validar firma
  const { signature, timestamp } = evento
  const propiedades = signature.properties as string[]
  
  // Construir cadena: valores de propiedades + timestamp + events_secret
  let cadena = ''
  for (const prop of propiedades) {
    cadena += prop.split('.').reduce((obj: Record<string, unknown>, key: string) => 
      (obj as Record<string, unknown>)[key] as Record<string, unknown>, evento.data as Record<string, unknown>)
  }
  cadena += timestamp
  cadena += process.env.WOMPI_EVENTS_SECRET

  const hashEsperado = crypto.createHash('sha256').update(cadena).digest('hex')
  
  if (hashEsperado !== signature.checksum) {
    return res.status(401).json({ error: 'Firma inválida' })
  }

  // 2. Procesar evento
  if (evento.event === 'transaction.updated') {
    const tx = evento.data.transaction
    
    if (tx.status === 'APPROVED') {
      // Marcar orden como pagada
      await prisma.orden.updateMany({
        where: { id_orden: tx.reference, estado: 'pendiente' },
        data: {
          estado: 'pagada',
          referencia_pago: tx.id,
        },
      })

      // Notificar al vendedor por WebSocket
      // ... getIO()?.to(`user:${vendedorId}`).emit('orden_pagada', ...)
    }

    if (tx.status === 'DECLINED' || tx.status === 'ERROR') {
      // Opcional: notificar al comprador que el pago falló
    }
  }

  res.status(200).json({ received: true })
})
```

### 6.3 Payload de ejemplo — `transaction.updated`

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "04a6e53d-a244-4140-ab9e-48fa541f9fe5",
      "status": "APPROVED",
      "amountInCents": 4500000,
      "reference": "id-orden-uuid"
    }
  },
  "signature": {
    "properties": ["transaction.id", "transaction.status", "transaction.amountInCents"],
    "checksum": "82f0e769..."
  },
  "timestamp": 1747673128600
}
```

> ⚠️ Siempre responder `200` rápido. Si fallas, Wompi reintenta 3 veces.  
> ⚠️ Implementar **idempotencia**: verificar si la orden ya está en estado `pagada` antes de procesarla.

---

## 7. Flujo 3 — Liquidación al vendedor (Payouts)

Una vez la orden está `completada`, transferir `monto_vendedor` a la cuenta bancaria del vendedor.

### 7.1 Agregar datos bancarios al vendedor

Necesitas un nuevo campo en la tabla `Tienda` o tabla separada `CuentasBancarias`:

```prisma
model CuentaBancaria {
  id           String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  id_vendedor  String  @unique @db.Uuid
  banco_id     String  // UUID del banco en Wompi (GET /banks)
  tipo_cuenta  String  // "AHORROS" | "CORRIENTE"
  numero       String
  tipo_doc     String  // "CC" | "NIT" | "CE"
  numero_doc   String
  nombre       String
  email        String
  
  vendedor     Usuario @relation(fields: [id_vendedor], references: [id_usuario])
  @@map("cuentas_bancarias")
}
```

### 7.2 Crear payout individual al completar orden

```typescript
// packages/backend/src/services/wompi.ts

export async function liquidarVendedor(orden: Orden, cuenta: CuentaBancaria) {
  const montoVendedor = Number(orden.monto_vendedor)  // ya calculado al crear la orden

  const res = await fetch(`${PAYOUTS_BASE}/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WOMPI_PAYOUTS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountId: process.env.WOMPI_PAYOUTS_ACCOUNT_ID,
      reference: `liquidacion-${orden.id_orden}`,
      paymentType: 'OTHER',
      transactions: [{
        legalIdType: cuenta.tipo_doc,
        legalId: cuenta.numero_doc,
        bankId: cuenta.banco_id,
        accountType: cuenta.tipo_cuenta,
        accountNumber: cuenta.numero,
        name: cuenta.nombre,
        email: cuenta.email,
        amount: Math.round(montoVendedor * 100), // en centavos
        reference: `venta-${orden.id_orden}`,
      }],
    }),
  })

  const data = await res.json()
  return data
}
```

### 7.3 Llamar la liquidación al completar orden

```typescript
// En el PATCH /ordenes/:id/estado, cuando estado === 'completada':
if (estado === 'completada') {
  const cuenta = await prisma.cuentaBancaria.findUnique({
    where: { id_vendedor: vendedorId }
  })
  if (cuenta) {
    await liquidarVendedor(orden, cuenta).catch(e =>
      console.error('[payout] Error al liquidar vendedor:', e)
    )
  }
}
```

### 7.4 Webhook de Payouts — confirmar transferencia

```typescript
// evento: "payout.updated"
if (evento.event === 'payout.updated') {
  const { status, reference } = evento.data.payout
  // status: TOTAL_PAYMENT | PARTIAL_PAYMENT | REJECTED
  // reference: "liquidacion-{id_orden}"
  
  const ordenId = reference.replace('liquidacion-', '')
  // Guardar estado de liquidación en DB si lo necesitas
}
```

---

## 8. Comisión de plataforma

Ya implementado en el código (mayo 2026). Los campos en `Orden`:

| Campo | Valor ejemplo | Descripción |
|-------|---------------|-------------|
| `total` | $50,000 | Lo que paga el comprador |
| `comision_porcentaje` | 15 | % de la plataforma |
| `monto_comision` | $7,500 | Lo que retiene la plataforma |
| `monto_vendedor` | $42,500 | Lo que recibe el vendedor |

**Cambiar el porcentaje:** editar `COMISION_PCT` en `packages/backend/src/routes/ordenes.ts` línea ~54.

---

## 9. Plan de implementación por sprints

### Sprint 5 — Pagos básicos ✅ COMPLETADO (2026-05-16)

- [x] Tabla `cuentas_bancarias` en schema + `prisma db push`
- [x] `packages/backend/src/services/wompi.ts` — `calcularFirmaWompi()`
- [x] `GET /api/pagos/checkout-data/:ordenId` — firma SHA256 protegida en backend
- [x] `PUT /api/pagos/mi-cuenta-bancaria` + `GET /api/pagos/mi-cuenta-bancaria`
- [x] Widget de Wompi integrado en `CheckoutPage.tsx` (flujo 2 pasos)
- [x] `PagoResultadoPage.tsx` — página de éxito/error post-pago
- [x] Ruta `/pago/resultado` en `App.tsx`
- [x] `/webhooks/wompi` — validación firma + actualiza orden + WebSocket + email
- [x] Formulario cuenta bancaria en Dashboard → tab "Mi tienda"
- [ ] **Pendiente:** Configurar variables de entorno en Railway y Vercel (ver sección 10)

### Sprint 6 — Liquidaciones

- [ ] Servicio `liquidarVendedor()` con Payouts API
- [ ] Webhook `payout.updated` para confirmar transferencias
- [ ] Panel en dashboard vendedor: historial de liquidaciones + estado

### Opcional / futuro

- [ ] Liquidación en batch semanal (en lugar de por orden)
- [ ] Soporte tarjetas de crédito (tokenización)
- [ ] Reembolsos automáticos cuando se cancela una orden pagada

---

## 10. Variables de entorno necesarias

Agregar a Railway (backend) y localmente en `.env`:

```env
# Wompi — Transactions
WOMPI_PUBLIC_KEY=pub_test_XXXXXXXXXXXXXXXX
WOMPI_PRIVATE_KEY=prv_test_XXXXXXXXXXXXXXXX
WOMPI_INTEGRITY_SECRET=test_integrity_XXXXXXXX
WOMPI_EVENTS_SECRET=test_events_secret_XXXXXXXX

# Wompi — Payouts (liquidar vendedores)
WOMPI_PAYOUTS_API_KEY=tu_payouts_api_key
WOMPI_PAYOUTS_ACCOUNT_ID=uuid-de-tu-cuenta-origen

# App
FRONTEND_URL=https://marketplace-uniguajira.vercel.app
```

---

## Referencias oficiales

- [Wompi Docs — Transacciones](https://docs.wompi.co/en/docs/colombia/transacciones/)
- [Wompi Docs — Widget Checkout Web](https://docs.wompi.co/en/docs/colombia/widget-checkout-web/)
- [Wompi Docs — Métodos de pago](https://docs.wompi.co/en/docs/colombia/metodos-de-pago/)
- [Wompi Docs — Payouts (Pagos a terceros)](https://docs.wompi.co/en/docs/colombia/introduccion-pagos-a-terceros/)
- [Wompi Docs — Eventos / Webhooks](https://docs.wompi.co/en/docs/colombia/eventos-pagos-a-terceros/)
