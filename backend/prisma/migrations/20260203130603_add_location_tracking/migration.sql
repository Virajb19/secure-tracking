-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "destination_latitude" DECIMAL(10,7),
ADD COLUMN     "destination_longitude" DECIMAL(10,7),
ADD COLUMN     "destination_place_id" VARCHAR(255),
ADD COLUMN     "source_latitude" DECIMAL(10,7),
ADD COLUMN     "source_longitude" DECIMAL(10,7),
ADD COLUMN     "source_place_id" VARCHAR(255);

-- CreateTable
CREATE TABLE "agent_current_locations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" UUID,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_current_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_location_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_location_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_current_locations_user_id_key" ON "agent_current_locations"("user_id");

-- CreateIndex
CREATE INDEX "agent_current_locations_task_id_idx" ON "agent_current_locations"("task_id");

-- CreateIndex
CREATE INDEX "agent_location_history_user_id_idx" ON "agent_location_history"("user_id");

-- CreateIndex
CREATE INDEX "agent_location_history_task_id_idx" ON "agent_location_history"("task_id");

-- CreateIndex
CREATE INDEX "agent_location_history_recorded_at_idx" ON "agent_location_history"("recorded_at");

-- AddForeignKey
ALTER TABLE "agent_current_locations" ADD CONSTRAINT "agent_current_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_location_history" ADD CONSTRAINT "agent_location_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_location_history" ADD CONSTRAINT "agent_location_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
