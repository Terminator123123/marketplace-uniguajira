CREATE TABLE "favoritos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_usuario" UUID NOT NULL,
    "id_producto" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favoritos_id_usuario_id_producto_key" ON "favoritos"("id_usuario", "id_producto");
CREATE INDEX "favoritos_id_usuario_idx" ON "favoritos"("id_usuario");

ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;
