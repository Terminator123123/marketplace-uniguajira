# Marketplace Uniguajira — Guía del Equipo

> Documento para el equipo de desarrollo. Léelo antes de tocar código.

---

## ¿Qué estamos construyendo?

Una **plataforma de e-commerce universitaria** para que estudiantes y egresados de la Universidad de La Guajira puedan vender productos y servicios entre sí.

Piénsalo como un "Mercado Libre universitario" pero solo para la Uniguajira:
- Un estudiante de diseño puede ofrecer sus servicios de diseño gráfico
- Alguien de sistemas puede vender tutorías de programación
- Otro puede vender artesanías wayuu o alimentos

Solo pueden **vender** quienes tengan correo `@uniguajira.edu.co`. Cualquiera puede comprar.

---

## Stack tecnológico (qué herramientas usamos)

| Parte | Tecnología | Para qué sirve |
|-------|-----------|----------------|
| **Frontend** | React + Vite + Tailwind | La interfaz que ve el usuario |
| **Backend** | Node.js + Express | El servidor que procesa todo |
| **Base de datos** | PostgreSQL + Prisma | Guarda usuarios, productos, órdenes |
| **Autenticación** | JWT | Para que cada usuario tenga su sesión |
| **Imágenes** | Cloudinary | Subir fotos de productos |
| **Pagos** | Wompi / ePayco | Nequi, Daviplata, PSE |
| **Lenguaje** | TypeScript | JavaScript con tipado (menos bugs) |

---

## Estructura del proyecto

```
marketplace-uniguajira/
├── packages/
│   ├── frontend/        ← Lo que ve el usuario (React)
│   ├── backend/         ← El servidor (Express)
│   │   └── prisma/      ← Esquema de base de datos
│   └── shared/          ← Tipos TypeScript compartidos
├── .github/workflows/   ← CI automático en cada PR
└── PROYECTO.md          ← Este archivo
```

Para instalar y correr el proyecto:
```bash
npm install          # Instala todo
npm run dev          # Corre frontend (:5173) y backend (:3001)
```

---

## ¿Dónde estamos? — Estado actual

### ✅ Sprint 1 COMPLETO (semana 1–2)
Lo que ya está hecho y subido al repo:

- [x] Monorepo configurado (frontend + backend + shared)
- [x] Todos los tipos TypeScript definidos (Usuario, Producto, Orden, etc.)
- [x] Backend con rutas: `/auth`, `/usuarios`, `/productos`, `/ordenes`
- [x] Base de datos diseñada (7 tablas, índices, relaciones)
- [x] Frontend con 6 páginas: Home, Login, Registro, Catálogo, Producto, Dashboard
- [x] Sistema de autenticación con JWT
- [x] CI automático en GitHub Actions
- [x] Proyecto en GitHub

---

## ¿Qué falta? — Próximos sprints

### 🔄 Sprint 2 — Autenticación funcional (semana 3–4)
**Meta: que alguien pueda registrarse y entrar a la plataforma**

- [ ] Instalar PostgreSQL y conectar la base de datos
- [ ] Correr migraciones (`npm run db:migrate`)
- [ ] Probar registro con correo `@uniguajira.edu.co`
- [ ] Probar login y que el token funcione
- [ ] Panel de admin para activar cuentas nuevas
- [ ] Subir foto de perfil a Cloudinary

### 🔜 Sprint 3 — Catálogo funcional (semana 5–6)
**Meta: que un vendedor pueda publicar un producto**

- [ ] Formulario de creación de producto
- [ ] Subida de imágenes a Cloudinary
- [ ] Vista del catálogo con filtros reales
- [ ] Página de detalle de producto

### 🔜 Sprint 4 — Dashboard de vendedor (semana 7–8)
**Meta: que el vendedor vea sus ventas**

- [ ] Dashboard con KPIs reales (ventas, pedidos)
- [ ] Gestión de stock
- [ ] Vista pública de la tienda

### 🔜 Sprint 5 — Pagos (semana 9–10)
**Meta: que se pueda comprar algo realmente**

- [ ] Integración Wompi sandbox
- [ ] Flujo de pago con Nequi/Daviplata/PSE
- [ ] Notificación al vendedor cuando paga el comprador
- [ ] Generación de factura

### 🔜 Sprint 6 — Chat y pruebas (semana 11–12)
**Meta: comunicación comprador-vendedor + plataforma estable**

- [ ] Chat en tiempo real (WebSockets)
- [ ] Notificaciones de estado del pedido
- [ ] Pruebas de carga
- [ ] Revisión de seguridad

### 🔜 Sprint 7–8 — Lanzamiento piloto (semana 13–16)
**Meta: primera versión real en Riohacha**

- [ ] Deploy en servidor de producción
- [ ] Dominio + SSL
- [ ] 10 vendedores piloto de la Uniguajira
- [ ] Documentación de API

---

## Meta del próximo mes (mayo–junio 2026)

Al final de mayo queremos tener **Sprint 2 y Sprint 3 completos**:

1. La plataforma corriendo en un servidor real (no solo en nuestro PC)
2. Cualquier estudiante con correo `@uniguajira.edu.co` puede registrarse
3. Un vendedor puede publicar un producto con fotos
4. El catálogo funciona con búsqueda y filtros

---

## Cómo trabajamos — Reglas del equipo

### Nunca toques `master` directamente
Todo cambio va en una rama separada:
```bash
git checkout -b feature/nombre-de-lo-que-haces
# ... haces tus cambios ...
git add .
git commit -m "descripción de lo que hiciste"
git push origin feature/nombre-de-lo-que-haces
```
Luego abres un **Pull Request** en GitHub y el otro lo revisa antes de mergear.

### Nombres de ramas
- `feature/login-ui` — nueva funcionalidad
- `fix/error-en-registro` — corrección de bug
- `chore/actualizar-dependencias` — mantenimiento

### Mensajes de commit
```
feat: agrega formulario de login        ← nueva funcionalidad
fix: corrige validación de email        ← arregla un bug
chore: actualiza dependencias           ← mantenimiento
```

### Antes de abrir un Pull Request
- [ ] El código compila sin errores (`npm run build`)
- [ ] No rompiste nada que antes funcionaba
- [ ] El PR tiene una descripción clara de qué hace

---

## Cómo marcar el progreso

Usamos los **Issues de GitHub** para rastrear tareas:

1. Ve al repo → pestaña **Issues** → **New Issue**
2. Crea un issue por cada tarea pendiente del sprint actual
3. Cuando lo terminas, cierra el issue con el commit:
   ```bash
   git commit -m "feat: agrega login — closes #3"
   ```
   GitHub cierra el issue automáticamente.

También usamos el **Project Board** (pestaña Projects en GitHub):
- **To Do** → tareas pendientes
- **In Progress** → en lo que estoy trabajando ahora
- **Done** → terminado

---

## Contacto y dudas

Si tienes dudas sobre el código, abre un Issue en GitHub con el tag `question`.
Si algo está roto, abre uno con el tag `bug`.
