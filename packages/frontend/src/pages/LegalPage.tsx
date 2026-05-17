import { useState } from 'react'
import { FileText, Shield, RotateCcw } from 'lucide-react'

type Tab = 'terminos' | 'privacidad' | 'devoluciones'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'terminos',     label: 'Términos y Condiciones', icon: FileText  },
  { key: 'privacidad',   label: 'Política de Privacidad', icon: Shield    },
  { key: 'devoluciones', label: 'Devoluciones y Garantías', icon: RotateCcw },
]

export default function LegalPage() {
  const [tab, setTab] = useState<Tab>('terminos')

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Documentos Legales</h1>
      <p className="text-gray-500 text-sm mb-6">
        Marketplace Uniguajira · Vigente desde mayo de 2026
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
        {tab === 'terminos'     && <Terminos />}
        {tab === 'privacidad'   && <Privacidad />}
        {tab === 'devoluciones' && <Devoluciones />}
      </div>
    </div>
  )
}

// ── Términos y Condiciones ────────────────────────────────────────────────────

function Terminos() {
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">1. Definiciones y naturaleza de la plataforma</h2>
        <p>
          <strong>Marketplace Uniguajira</strong> (en adelante "la Plataforma") es un proyecto académico
          piloto operado por estudiantes y egresados de la Universidad de La Guajira, con sede en Riohacha,
          Colombia. La Plataforma actúa como <strong>intermediaria tecnológica</strong> que conecta
          compradores y vendedores que forman parte de la comunidad universitaria.
        </p>
        <p className="mt-2">
          La Plataforma <strong>no es vendedora directa</strong> de ningún producto o servicio publicado
          en ella. Cada vendedor es un usuario independiente que actúa en nombre propio y asume plena
          responsabilidad por los bienes o servicios que ofrece.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">2. Marco legal aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República de Colombia, en particular:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Ley 1480 de 2011</strong> — Estatuto del Consumidor</li>
          <li><strong>Ley 1581 de 2012</strong> — Protección de Datos Personales (Habeas Data)</li>
          <li><strong>Decreto 1074 de 2015</strong> — Reglamentación comercio electrónico</li>
          <li><strong>Ley 2439 de 2024</strong> — Modificaciones al comercio electrónico</li>
        </ul>
        <p className="mt-2">
          Cualquier controversia se resolverá ante los jueces competentes de Riohacha, La Guajira, o
          ante la Superintendencia de Industria y Comercio (SIC) para asuntos de protección al consumidor.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">3. Responsabilidades del vendedor</h2>
        <p>Al registrarse como vendedor, el usuario acepta y declara que:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Es el único responsable de la calidad, veracidad y legalidad de sus publicaciones.</li>
          <li>Garantiza que los productos o servicios ofrecidos cumplen con la normatividad colombiana vigente.</li>
          <li>Se compromete a entregar los productos en las condiciones pactadas con el comprador.</li>
          <li>Asume responsabilidad directa ante el comprador en caso de pérdida, daño o producto
            diferente al anunciado durante la entrega bajo su gestión.</li>
          <li>Responderá solidariamente con la Plataforma frente a reclamaciones del consumidor
            conforme al Art. 10 de la Ley 1480 de 2011.</li>
          <li>Acepta que la Plataforma retiene una comisión del <strong>15% sobre el valor de cada venta</strong>
            como contraprestación por el servicio de intermediación y procesamiento de pagos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">4. Responsabilidades del comprador</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Revisar el producto al momento de la entrega y reportar cualquier inconformidad en un
            plazo máximo de <strong>48 horas</strong> a través del chat de la orden.</li>
          <li>Proporcionar información de entrega completa y correcta.</li>
          <li>Cumplir con los tiempos de reclamación establecidos en la Política de Devoluciones.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">5. Responsabilidad de la Plataforma</h2>
        <p>La Plataforma se responsabiliza de:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Mantener el sistema de pagos seguro y el dinero del comprador retenido hasta confirmar
            la recepción del producto.</li>
          <li>Brindar el canal de comunicación entre compradores y vendedores.</li>
          <li>Gestionar las reclamaciones reportadas en el plazo de <strong>5 días hábiles</strong>.</li>
          <li>Verificar la identidad de los vendedores mediante correo institucional
            <em>@uniguajira.edu.co</em>.</li>
        </ul>
        <p className="mt-2">
          La Plataforma <strong>no asume responsabilidad</strong> por pérdidas o daños ocasionados
          en entregas gestionadas directamente por el vendedor sin uso del servicio de delivery de
          la Plataforma, ni por productos cuya calidad sea responsabilidad exclusiva del vendedor.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">6. Proceso de reclamaciones</h2>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>El comprador reporta el problema a través del <strong>chat de la orden</strong> dentro de las 48h de recibido.</li>
          <li>El vendedor tiene <strong>24 horas</strong> para responder y proponer solución.</li>
          <li>Si no hay acuerdo, la Plataforma interviene como mediadora en un plazo de <strong>48 horas adicionales</strong>.</li>
          <li>En última instancia, el comprador puede acudir a la <strong>SIC</strong> en www.sic.gov.co.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">7. Prohibiciones</h2>
        <p>Está expresamente prohibido publicar en la Plataforma:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Productos ilegales, falsificados, robados o de procedencia dudosa.</li>
          <li>Servicios que atenten contra la moral, las buenas costumbres o la ley colombiana.</li>
          <li>Contenido que infrinja derechos de autor, marcas registradas o propiedad intelectual.</li>
          <li>Publicaciones con información falsa o engañosa sobre el producto o el vendedor.</li>
        </ul>
        <p className="mt-2">
          El incumplimiento de estas prohibiciones puede resultar en la suspensión inmediata de la
          cuenta y, según la gravedad, en denuncias ante las autoridades competentes.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">8. Modificaciones</h2>
        <p>
          La Plataforma se reserva el derecho de modificar estos términos con un aviso previo de
          <strong> 15 días calendario</strong> publicado en la plataforma. El uso continuado de la
          Plataforma tras la notificación implica aceptación de los nuevos términos.
        </p>
      </section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        Última actualización: mayo de 2026 · Contacto: marketplace@uniguajira.edu.co
      </p>
    </div>
  )
}

// ── Política de Privacidad ────────────────────────────────────────────────────

function Privacidad() {
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de datos personales es <strong>Marketplace Uniguajira</strong>,
          proyecto académico adscrito a la Universidad de La Guajira, Riohacha, Colombia.
          Contacto: marketplace@uniguajira.edu.co
        </p>
        <p className="mt-2">
          Este tratamiento se realiza conforme a la <strong>Ley 1581 de 2012</strong> y el
          Decreto 1074 de 2015 (Decreto Único Reglamentario del Sector Comercio).
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">2. Datos que recopilamos</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Registro:</strong> nombre, correo institucional, facultad.</li>
          <li><strong>Vendedores:</strong> datos de la tienda, fotografías de productos, información bancaria para pagos.</li>
          <li><strong>Transacciones:</strong> historial de órdenes, métodos de pago utilizados (no almacenamos datos de tarjeta).</li>
          <li><strong>Uso:</strong> páginas visitadas, productos favoritos, dispositivo y navegador (para mejorar el servicio).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">3. Finalidad del tratamiento</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Gestionar cuentas de usuario y autenticación.</li>
          <li>Procesar y hacer seguimiento de órdenes de compra.</li>
          <li>Enviar notificaciones relacionadas con el servicio (no publicidad sin consentimiento).</li>
          <li>Liquidar pagos a vendedores.</li>
          <li>Mejorar la experiencia y funcionalidades de la Plataforma.</li>
          <li>Cumplir con obligaciones legales.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">4. Compartición de datos</h2>
        <p>Tus datos <strong>no se venden ni se comparten</strong> con terceros con fines comerciales. Solo se comparten con:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Wompi / Bancolombia Group:</strong> para procesar pagos (datos mínimos necesarios).</li>
          <li><strong>Cloudinary:</strong> almacenamiento de imágenes.</li>
          <li><strong>Autoridades competentes:</strong> cuando la ley lo exija.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">5. Tiempo de conservación</h2>
        <p>
          Los datos se conservan mientras la cuenta esté activa y por <strong>5 años adicionales</strong>
          tras su eliminación, según lo exige la normatividad tributaria y comercial colombiana.
          Los datos de transacciones se conservan por <strong>10 años</strong> por obligaciones contables.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">6. Tus derechos (Habeas Data)</h2>
        <p>Conforme a la Ley 1581 de 2012, tienes derecho a:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Conocer</strong> qué datos tenemos sobre ti.</li>
          <li><strong>Actualizar</strong> tus datos desde tu perfil.</li>
          <li><strong>Rectificar</strong> datos incorrectos contactándonos.</li>
          <li><strong>Eliminar</strong> tu cuenta y datos (sujeto a obligaciones legales de conservación).</li>
          <li><strong>Revocar</strong> el consentimiento para usos no esenciales.</li>
        </ul>
        <p className="mt-2">
          Para ejercer estos derechos escríbenos a: <strong>marketplace@uniguajira.edu.co</strong>.
          Responderemos en un máximo de <strong>10 días hábiles</strong>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">7. Seguridad</h2>
        <p>
          Implementamos medidas técnicas para proteger tus datos: contraseñas encriptadas con bcrypt,
          comunicaciones HTTPS, tokens JWT con expiración, y acceso restringido a datos sensibles.
          Sin embargo, ningún sistema es 100% seguro. En caso de brecha de seguridad que afecte tus
          datos, te notificaremos en un plazo máximo de 72 horas.
        </p>
      </section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        Última actualización: mayo de 2026 · marketplace@uniguajira.edu.co
      </p>
    </div>
  )
}

// ── Política de Devoluciones ──────────────────────────────────────────────────

function Devoluciones() {
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">1. Derecho de retracto</h2>
        <p>
          Conforme al <strong>Artículo 47 de la Ley 1480 de 2011</strong>, tienes derecho a retractarte
          de una compra realizada en línea dentro de los <strong>5 días hábiles</strong> siguientes a
          la recepción del producto, sin necesidad de justificar la decisión, siempre que:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>El producto esté en las mismas condiciones en que fue recibido.</li>
          <li>No sea un producto digital descargado, servicio ya prestado, o producto perecedero.</li>
          <li>Se notifique al vendedor a través del chat de la orden dentro del plazo.</li>
        </ul>
        <p className="mt-2">
          El reembolso se realizará por el mismo método de pago utilizado dentro de los
          <strong> 30 días calendario</strong> siguientes a la recepción del producto devuelto.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">2. Garantía legal mínima</h2>
        <p>
          Todos los productos físicos vendidos en la Plataforma tienen una <strong>garantía mínima
          de 1 año</strong> conforme al Art. 8 de la Ley 1480 de 2011. Durante este período,
          el vendedor está obligado a:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Reparar el producto sin costo.</li>
          <li>Reemplazarlo por uno equivalente si no es posible la reparación.</li>
          <li>Devolver el dinero si ninguna de las anteriores es posible.</li>
        </ul>
        <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          ⚠️ Los servicios prestados por estudiantes (clases, diseño, etc.) no aplican garantía
          sobre el resultado, sino sobre la prestación del servicio en los términos acordados.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">3. Proceso de devolución paso a paso</h2>
        <ol className="list-decimal list-inside space-y-2 mt-2">
          <li>
            <strong>Reportar dentro del plazo:</strong> abre la orden en "Mis pedidos" y
            usa el chat para notificar al vendedor con foto del producto y descripción del problema.
          </li>
          <li>
            <strong>Acuerdo con el vendedor:</strong> el vendedor tiene 24 horas para responder
            y coordinar la devolución física del producto.
          </li>
          <li>
            <strong>Devolución física:</strong> el comprador entrega el producto al vendedor
            (en el campus universitario o punto acordado).
          </li>
          <li>
            <strong>Reembolso:</strong> una vez el vendedor confirma la recepción, la Plataforma
            procesa el reembolso en máximo 30 días calendario.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">4. Casos no cubiertos por devolución</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Productos personalizados a solicitud del comprador.</li>
          <li>Servicios ya prestados en su totalidad.</li>
          <li>Productos alimenticios o perecederos.</li>
          <li>Daños causados por mal uso del comprador.</li>
          <li>Productos cuyo deterioro sea por uso normal.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">5. Quién asume el costo de envío en devolución</h2>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Producto defectuoso o diferente al anunciado:</strong> el vendedor asume el costo.</li>
          <li><strong>Retracto por arrepentimiento:</strong> el comprador asume el costo de devolución.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-gray-800 mb-2">6. Escalación a la SIC</h2>
        <p>
          Si no obtienes respuesta satisfactoria del vendedor o de la Plataforma, puedes radicar
          una reclamación formal ante la <strong>Superintendencia de Industria y Comercio</strong>:
        </p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Web: <strong>www.sic.gov.co</strong> → Protección al Consumidor → Radicación de quejas</li>
          <li>Línea gratuita nacional: 01 8000 910 165</li>
        </ul>
      </section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        Última actualización: mayo de 2026 · marketplace@uniguajira.edu.co
      </p>
    </div>
  )
}
