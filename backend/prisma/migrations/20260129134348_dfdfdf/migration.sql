-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
