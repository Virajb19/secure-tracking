import { Module } from '@nestjs/common';
import { ExamCentersController } from './exam-centers.controller';
import { ExamCentersService } from './exam-centers.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [ExamCentersController],
  providers: [ExamCentersService],
  exports: [ExamCentersService],
})
export class ExamCentersModule {}
