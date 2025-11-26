-- DropForeignKey
ALTER TABLE "public"."WorkOrder" DROP CONSTRAINT "WorkOrder_technicianId_fkey";

-- AlterTable
ALTER TABLE "public"."Motorcycle" ADD COLUMN     "issueDescription" TEXT;

-- AlterTable
ALTER TABLE "public"."Sale" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "technicianId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
