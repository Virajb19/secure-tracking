-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_center_superintendent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "exam_centers" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "superintendent_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_centers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_centers_school_id_key" ON "exam_centers"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_centers_superintendent_id_key" ON "exam_centers"("superintendent_id");

-- CreateIndex
CREATE INDEX "exam_centers_school_id_idx" ON "exam_centers"("school_id");

-- CreateIndex
CREATE INDEX "exam_centers_superintendent_id_idx" ON "exam_centers"("superintendent_id");

-- AddForeignKey
ALTER TABLE "exam_centers" ADD CONSTRAINT "exam_centers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_centers" ADD CONSTRAINT "exam_centers_superintendent_id_fkey" FOREIGN KEY ("superintendent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_centers" ADD CONSTRAINT "exam_centers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
