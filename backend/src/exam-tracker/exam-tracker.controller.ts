import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { User, UserRole } from '@prisma/client';
import { ExamTrackerService } from './exam-tracker.service';
import { CreateExamTrackerEventDto, ExamTrackerEventType } from './dto/create-exam-tracker-event.dto';
import { JwtAuthGuard, RolesGuard, CenterSuperintendentGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';

/**
 * Multer configuration for secure image upload.
 */
const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req: any, file: Express.Multer.File, callback: Function) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException('Only JPEG, PNG, and WebP images are allowed'),
        false,
      );
    }
  },
};

/**
 * Exam Tracker Controller.
 * 
 * Endpoints for Center Superintendents (Headmasters) to track
 * question paper events at exam centers.
 * 
 * API Endpoints:
 * - POST /exam-tracker/events - Submit a new event
 * - GET /exam-tracker/events - Get events for user's school
 * - GET /exam-tracker/events/summary - Get event summary for user's school
 * - GET /exam-tracker/all - Get all events (admin only)
 */
@Controller('exam-tracker')
@UseGuards(JwtAuthGuard, RolesGuard, CenterSuperintendentGuard)
export class ExamTrackerController {
  constructor(private readonly examTrackerService: ExamTrackerService) { }

  /**
   * Submit a new exam tracker event with image.
   * Only users with is_center_superintendent flag can submit events.
   * A Teacher or Headmaster can be assigned this role.
   */
  @Post('events')
  @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async createEvent(
    @Body() createDto: CreateExamTrackerEventDto,
    @UploadedFile() imageFile: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!imageFile) {
      throw new BadRequestException('Image is required');
    }

    const event = await this.examTrackerService.create(createDto, imageFile, user.id);

    return {
      success: true,
      message: 'Event submitted successfully',
      data: event,
    };
  }

  /**
   * Get events for the current user's school.
   * Headmaster views their own exam center status.
   */
  @Get('events')
  @Roles(UserRole.HEADMASTER, UserRole.TEACHER)
  async getMySchoolEvents(
    @CurrentUser() user: User,
    @Query('date') examDate?: string,
  ) {
    const result = await this.examTrackerService.getMySchoolEvents(
      user.id,
      examDate || new Date().toISOString().split('T')[0],
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get event summary for the current user's school.
   * Shows which events are completed and which are pending.
   */
  @Get('events/summary')
  @Roles(UserRole.HEADMASTER, UserRole.TEACHER)
  async getEventSummary(
    @CurrentUser() user: User,
    @Query('date') examDate?: string,
  ) {
    // Explicit exam-day validation for non-admin users
    if (user.role !== UserRole.ADMIN && user.role !== ('SUPER_ADMIN' as UserRole)) {
      const userWithAssignment = await this.examTrackerService['db'].user.findUnique({
        where: { id: user.id },
        select: { exam_center_assignment: { select: { id: true } } },
      });

      const examCenterId = userWithAssignment?.exam_center_assignment?.id;
      if (examCenterId) {
        const examDayCheck = await this.examTrackerService['examSchedulerService'].isExamDayForCenter(examCenterId);
        if (!examDayCheck.isExamDay) {
          throw new ForbiddenException(
            examDayCheck.nextExamDate
              ? `Question Paper Tracking will be available on ${examDayCheck.nextExamDate}. Please come back on the exam date.`
              : 'No upcoming exams scheduled for your exam center.',
          );
        }
      }
    }

    // First get the school info
    const schoolData = await this.examTrackerService.getMySchoolEvents(
      user.id,
      examDate || new Date().toISOString().split('T')[0],
    );

    const summary = await this.examTrackerService.getEventSummary(
      schoolData.school_id,
      examDate || new Date().toISOString().split('T')[0],
    );

    return {
      success: true,
      data: {
        school_id: schoolData.school_id,
        school_name: schoolData.school_name,
        ...summary,
      },
    };
  }

  /**
   * Get a single event by ID.
   */
  @Get('events/:eventId')
  @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.ADMIN)
  async getEventById(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    const event = await this.examTrackerService.getEventById(eventId);

    return {
      success: true,
      data: event,
    };
  }

  /**
   * Get all events across schools (Admin only).
   * Used for monitoring all exam centers.
   */
  @Get('all')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAllEvents(
    @Query('date') examDate?: string,
    @Query('eventType') eventType?: ExamTrackerEventType,
    @Query('schoolId') schoolId?: string,
  ) {
    const events = await this.examTrackerService.getAllEvents({
      examDate,
      eventType,
      schoolId,
    });

    return {
      success: true,
      data: events,
    };
  }
}
