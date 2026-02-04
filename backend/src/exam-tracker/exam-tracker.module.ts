import { Module } from '@nestjs/common';
import { ExamTrackerController } from './exam-tracker.controller';
import { ExamTrackerService } from './exam-tracker.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [ExamTrackerController],
  providers: [ExamTrackerService],
  exports: [ExamTrackerService],
})
export class ExamTrackerModule {}
