import { Module } from '@nestjs/common';
import { ExamSchedulerController } from './exam-scheduler.controller';
import { ExamSchedulerService } from './exam-scheduler.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [ExamSchedulerController],
  providers: [ExamSchedulerService],
  exports: [ExamSchedulerService],
})
export class ExamSchedulerModule {}
