-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'CLEAR', 'CONSIDER', 'DISPUTE', 'CANCELLED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'BACKGROUND_CHECK_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'BACKGROUND_CHECK_REJECTED';

-- CreateTable
CREATE TABLE "background_checks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "BackgroundCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sterling_order_id" TEXT,
    "sterling_report_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" TEXT,
    "zip_code" TEXT,
    "initiated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "raw_result" JSONB,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "background_checks_user_id_key" ON "background_checks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "background_checks_sterling_order_id_key" ON "background_checks"("sterling_order_id");

-- CreateIndex
CREATE INDEX "background_checks_status_idx" ON "background_checks"("status");

-- CreateIndex
CREATE INDEX "background_checks_sterling_order_id_idx" ON "background_checks"("sterling_order_id");

-- AddForeignKey
ALTER TABLE "background_checks" ADD CONSTRAINT "background_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
