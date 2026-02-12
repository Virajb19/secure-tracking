import { Module } from '@nestjs/common';
import { ExamTrackerController } from './exam-tracker.controller';
import { ExamTrackerService } from './exam-tracker.service';
import { PrismaModule } from '../prisma';
import { ExamSchedulerModule } from '../exam-scheduler/exam-scheduler.module';

@Module({
  imports: [PrismaModule, ExamSchedulerModule],
  controllers: [ExamTrackerController],
  providers: [ExamTrackerService],
  exports: [ExamTrackerService],
})
export class ExamTrackerModule {}
