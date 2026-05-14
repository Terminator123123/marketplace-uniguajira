-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "email_verificado" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "activo" SET DEFAULT false;

-- CreateTable
CREATE TABLE "tokens_verificacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_usuario" UUID NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_verificacion_token_key" ON "tokens_verificacion"("token");

-- AddForeignKey
ALTER TABLE "tokens_verificacion" ADD CONSTRAINT "tokens_verificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
