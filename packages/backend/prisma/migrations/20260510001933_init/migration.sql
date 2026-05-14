-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('vendedor', 'comprador', 'admin');

-- CreateEnum
CREATE TYPE "TiendaEstado" AS ENUM ('pendiente', 'activa', 'suspendida');

-- CreateEnum
CREATE TYPE "ProductoTipo" AS ENUM ('fisico', 'servicio');

-- CreateEnum
CREATE TYPE "OrdenEstado" AS ENUM ('pendiente', 'pagada', 'en_entrega', 'completada', 'cancelada');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('nequi', 'daviplata', 'pse');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "UserRole" NOT NULL DEFAULT 'comprador',
    "facultad" VARCHAR(100),
    "bio" TEXT,
    "foto_url" VARCHAR(255),
    "rating_promedio" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "tiendas" (
    "id_tienda" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_vendedor" UUID NOT NULL,
    "nombre_tienda" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "banner_url" VARCHAR(255),
    "estado" "TiendaEstado" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiendas_pkey" PRIMARY KEY ("id_tienda")
);

-- CreateTable
CREATE TABLE "productos" (
    "id_producto" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_tienda" UUID NOT NULL,
    "id_vendedor" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(12,2) NOT NULL,
    "tipo" "ProductoTipo" NOT NULL,
    "categoria" VARCHAR(50) NOT NULL,
    "stock" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "imagenes_producto" (
    "id_imagen" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_producto" UUID NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "orden" INTEGER NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "imagenes_producto_pkey" PRIMARY KEY ("id_imagen")
);

-- CreateTable
CREATE TABLE "ordenes" (
    "id_orden" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_comprador" UUID NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "estado" "OrdenEstado" NOT NULL DEFAULT 'pendiente',
    "metodo_pago" "MetodoPago" NOT NULL,
    "referencia_pago" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id_orden")
);

-- CreateTable
CREATE TABLE "items_orden" (
    "id_item" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_orden" UUID NOT NULL,
    "id_producto" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "items_orden_pkey" PRIMARY KEY ("id_item")
);

-- CreateTable
CREATE TABLE "resenas" (
    "id_resena" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_orden" UUID NOT NULL,
    "id_comprador" UUID NOT NULL,
    "id_producto" UUID NOT NULL,
    "estrellas" SMALLINT NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id_resena")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id_mensaje" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_orden" UUID NOT NULL,
    "id_remitente" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id_mensaje")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tiendas_id_vendedor_key" ON "tiendas"("id_vendedor");

-- CreateIndex
CREATE INDEX "productos_categoria_tipo_activo_idx" ON "productos"("categoria", "tipo", "activo");

-- CreateIndex
CREATE INDEX "productos_id_tienda_activo_idx" ON "productos"("id_tienda", "activo");

-- CreateIndex
CREATE INDEX "productos_precio_idx" ON "productos"("precio");

-- CreateIndex
CREATE INDEX "ordenes_id_comprador_created_at_idx" ON "ordenes"("id_comprador", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ordenes_estado_idx" ON "ordenes"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "resenas_id_orden_id_producto_key" ON "resenas"("id_orden", "id_producto");

-- CreateIndex
CREATE INDEX "mensajes_id_orden_created_at_idx" ON "mensajes"("id_orden", "created_at" ASC);

-- AddForeignKey
ALTER TABLE "tiendas" ADD CONSTRAINT "tiendas_id_vendedor_fkey" FOREIGN KEY ("id_vendedor") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_id_tienda_fkey" FOREIGN KEY ("id_tienda") REFERENCES "tiendas"("id_tienda") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes_producto" ADD CONSTRAINT "imagenes_producto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_id_comprador_fkey" FOREIGN KEY ("id_comprador") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "ordenes"("id_orden") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_orden" ADD CONSTRAINT "items_orden_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "ordenes"("id_orden") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_comprador_fkey" FOREIGN KEY ("id_comprador") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "ordenes"("id_orden") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_id_remitente_fkey" FOREIGN KEY ("id_remitente") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
