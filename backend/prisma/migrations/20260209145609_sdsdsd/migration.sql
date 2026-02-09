-- CreateTable
CREATE TABLE "circular_schools" (
    "circular_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_schools_pkey" PRIMARY KEY ("circular_id","school_id")
);

-- CreateIndex
CREATE INDEX "circular_schools_school_id_idx" ON "circular_schools"("school_id");

-- AddForeignKey
ALTER TABLE "circular_schools" ADD CONSTRAINT "circular_schools_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "circulars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "circular_schools" ADD CONSTRAINT "circular_schools_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
