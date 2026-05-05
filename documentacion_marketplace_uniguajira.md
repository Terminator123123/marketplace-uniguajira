# Documentación Técnica: Marketplace Uniguajira
## Ecosistema Digital de Emprendimiento Universitario

**Versión:** 1.0.0
**Fecha:** 4 de mayo de 2026
**Autor:** Departamento de Ingeniería de Sistemas - Universidad de La Guajira
**Estado:** Fase de Diseño / Prototipado

---

## 1. Resumen Ejecutivo
El **Marketplace Uniguajira** es una plataforma de comercio electrónico diseñada para centralizar, formalizar y potenciar los emprendimientos de estudiantes y egresados de la Universidad de La Guajira. El sistema permite la comercialización de productos físicos y servicios profesionales, garantizando que las transacciones ocurran en un entorno seguro y validado institucionalmente.

---

## 2. Especificaciones Técnicas

### 2.1 Stack Tecnológico Recomendado
Para garantizar eficiencia y escalabilidad, se ha seleccionado el siguiente stack:

* **Frontend:** React.js (Web) / Tailwind CSS (Estilos).
* **Backend:** Node.js con Express.js.
* **Lenguaje:** TypeScript (para mayor robustez en la lógica de tipos).
* **Base de Datos:** PostgreSQL (Relacional para transacciones).
* **Almacenamiento de Imágenes:** Cloudinary o AWS S3.
* **Autenticación:** JWT (JSON Web Tokens) con integración OAuth para correos `@uniguajira.edu.co`.

### 2.2 Arquitectura del Sistema
El sistema sigue un modelo de **Arquitectura de Microservicios** para separar las responsabilidades críticas:
1.  **Servicio de Usuarios:** Registro, login y validación de estatus académico.
2.  **Servicio de Catálogo:** Gestión de productos, categorías y stock.
3.  **Servicio de Transacciones:** Integración con pasarelas de pago y generación de facturas.
4.  **Servicio de Mensajería:** Comunicación en tiempo real (WebSockets) para logística de entrega.

---

## 3. Funcionalidades del Sistema

### 3.1 Módulo de Usuario (Comprador/Vendedor)
* **Registro Institucional:** Solo usuarios con dominio educativo pueden crear tiendas.
* **Perfil de Emprendedor:** Espacio para mostrar biografía, facultad a la que pertenece y reputación basada en estrellas.
* **Panel de Control (Dashboard):** Visualización de ventas totales, productos más vistos y pedidos pendientes.

### 3.2 Gestión de Productos
* **Categorización:**
    * *Físicos:* Artesanías, papelería, tecnología, alimentos.
    * *Servicios:* Tutorías académicas, soporte técnico, diseño gráfico.
* **Multimedia:** Soporte para múltiples imágenes y descripciones detalladas.

### 3.3 Procesamiento de Pagos
* **Pasarela Local:** Integración con API de pagos (ej. Wompi o ePayco) para aceptar Nequi, Daviplata y PSE.
* **Validación de Pago:** El sistema notifica al vendedor solo cuando la transacción ha sido confirmada por la entidad financiera.

---

## 4. Diseño de la Base de Datos (Esquema Sugerido)

### Tabla: `Usuarios`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_usuario` | UUID (PK) | Identificador único. |
| `nombre` | VARCHAR | Nombre completo del estudiante/egresado. |
| `email` | VARCHAR (Unique) | Correo institucional. |
| `rol` | ENUM | 'vendedor', 'comprador', 'admin'. |

### Tabla: `Productos`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_producto` | UUID (PK) | Identificador único. |
| `id_vendedor` | UUID (FK) | Relación con la tabla Usuarios. |
| `nombre` | VARCHAR | Nombre del producto/servicio. |
| `precio` | DECIMAL | Valor en COP. |
| `stock` | INT | Cantidad disponible. |

---

## 5. Protocolo de Seguridad
1.  **Cifrado:** Contraseñas hasheadas con `bcrypt`.
2.  **Protección de Rutas:** Uso de Middlewares para verificar tokens de sesión.
3.  **Sanitización:** Prevención de Inyección SQL y ataques XSS mediante validación de entradas en el backend.

---

## 6. Hoja de Ruta (Roadmap)
1.  **Mes 1:** Diseño de UI/UX y configuración del servidor base.
2.  **Mes 2:** Desarrollo del módulo de catálogo y subida de archivos.
3.  **Mes 3:** Integración de pagos y pruebas de estrés.
4.  **Mes 4:** Lanzamiento piloto en la sede principal (Riohacha).

---

## 7. Contacto y Soporte
Para contribuciones técnicas, dirigirse al Laboratorio de Ingeniería de Sistemas o mediante el repositorio oficial del proyecto.
