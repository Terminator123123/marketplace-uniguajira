-- CreateEnum
CREATE TYPE "SolicitudEstado" AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- AlterTable
ALTER TABLE "imagenes_producto" ADD COLUMN     "public_id" VARCHAR(255),
ALTER COLUMN "url" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "activo" SET DEFAULT true;

-- CreateTable
CREATE TABLE "solicitudes_rol" (
    "id_solicitud" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_usuario" UUID NOT NULL,
    "rol_solicitado" "UserRole" NOT NULL,
    "motivacion" TEXT,
    "estado" "SolicitudEstado" NOT NULL DEFAULT 'pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_rol_pkey" PRIMARY KEY ("id_solicitud")
);

-- CreateIndex
CREATE INDEX "solicitudes_rol_estado_idx" ON "solicitudes_rol"("estado");

-- AddForeignKey
ALTER TABLE "solicitudes_rol" ADD CONSTRAINT "solicitudes_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
