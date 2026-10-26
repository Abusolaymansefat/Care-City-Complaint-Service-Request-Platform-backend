-- CreateEnum
CREATE TYPE "PaymentTiming" AS ENUM ('AFTER_SUBMISSION', 'AFTER_COMPLETION');

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "paymentRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "timing" "PaymentTiming" NOT NULL DEFAULT 'AFTER_SUBMISSION';

-- CreateIndex
CREATE INDEX "complaints_citizenId_paymentRequired_idx" ON "complaints"("citizenId", "paymentRequired");
