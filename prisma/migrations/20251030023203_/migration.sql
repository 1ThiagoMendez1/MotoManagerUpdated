/*
  Warnings:

  - The values [En_Reparacion,Completado] on the enum `WorkOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[saleNumber]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workOrderNumber]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `saleNumber` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workOrderNumber` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."WorkOrderStatus_new" AS ENUM ('Diagnosticando', 'Reparado', 'Entregado');
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" TYPE "public"."WorkOrderStatus_new" USING ("status"::text::"public"."WorkOrderStatus_new");
ALTER TYPE "public"."WorkOrderStatus" RENAME TO "WorkOrderStatus_old";
ALTER TYPE "public"."WorkOrderStatus_new" RENAME TO "WorkOrderStatus";
DROP TYPE "public"."WorkOrderStatus_old";
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" SET DEFAULT 'Diagnosticando';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "cedula" TEXT;

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'Efectivo',
ADD COLUMN     "saleNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."WorkOrder" ADD COLUMN     "diagnosticandoDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "entregadoDate" TIMESTAMP(3),
ADD COLUMN     "reparadoDate" TIMESTAMP(3),
ADD COLUMN     "workOrderNumber" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "public"."Sale"("saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workOrderNumber_key" ON "public"."WorkOrder"("workOrderNumber");
