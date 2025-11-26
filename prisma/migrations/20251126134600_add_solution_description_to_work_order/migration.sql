-- AlterTable
ALTER TABLE "public"."WorkOrder" ADD COLUMN     "solutionDescription" TEXT,
ALTER COLUMN "issueDescription" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "motorcycleId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromClient" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "public"."Motorcycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
