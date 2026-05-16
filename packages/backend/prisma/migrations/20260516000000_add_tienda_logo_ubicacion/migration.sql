-- AlterTable: add logo_url and ubicacion to tiendas
ALTER TABLE "tiendas" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(255);
ALTER TABLE "tiendas" ADD COLUMN IF NOT EXISTS "ubicacion" VARCHAR(300);
