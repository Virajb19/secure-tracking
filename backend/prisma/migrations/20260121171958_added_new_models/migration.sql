-- CreateEnum
CREATE TYPE "FacultyType" AS ENUM ('TEACHING', 'NON_TEACHING');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "District" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "registration_code" VARCHAR(50) NOT NULL,
    "district_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "faculty_type" "FacultyType" NOT NULL,
    "designation" VARCHAR(150) NOT NULL,
    "highest_qualification" VARCHAR(150) NOT NULL,
    "years_of_experience" INTEGER NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "is_profile_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "class_level" INTEGER NOT NULL,
    "subject" VARCHAR(100) NOT NULL,

    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonTeachingStaff" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "qualification" VARCHAR(150) NOT NULL,
    "nature_of_work" VARCHAR(150) NOT NULL,
    "years_of_service" INTEGER NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonTeachingStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentStrength" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_level" INTEGER NOT NULL,
    "boys" INTEGER NOT NULL,
    "girls" INTEGER NOT NULL,
    "sections" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentStrength_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE UNIQUE INDEX "School_registration_code_key" ON "School"("registration_code");

-- CreateIndex
CREATE INDEX "School_district_id_idx" ON "School"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_user_id_key" ON "Faculty"("user_id");

-- CreateIndex
CREATE INDEX "Faculty_school_id_idx" ON "Faculty"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_faculty_id_class_level_subject_key" ON "TeachingAssignment"("faculty_id", "class_level", "subject");

-- CreateIndex
CREATE INDEX "NonTeachingStaff_school_id_idx" ON "NonTeachingStaff"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentStrength_school_id_class_level_key" ON "StudentStrength"("school_id", "class_level");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonTeachingStaff" ADD CONSTRAINT "NonTeachingStaff_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStrength" ADD CONSTRAINT "StudentStrength_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
