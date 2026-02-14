import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { ExamSchedulerService } from './exam-scheduler.service';
import { CreateExamScheduleDto, UpdateExamScheduleDto, BulkCreateExamScheduleDto, ExamClass, SubjectCategory } from './dto/create-exam-schedule.dto';
import { JwtAuthGuard, RolesGuard, CenterSuperintendentGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';

/**
 * Exam Scheduler Controller.
 * 
 * Endpoints for managing exam schedules.
 * Admin can create/update/delete schedules.
 * Center Superintendents (Headmasters) can view schedules and get time windows.
 * 
 * API Endpoints:
 * - POST /api/exam-scheduler - Create schedule (Admin)
 * - POST /api/exam-scheduler/bulk - Bulk create schedules (Admin)
 * - GET /api/exam-scheduler - List all schedules
 * - GET /api/exam-scheduler/time-windows - Get time windows for a date
 * - GET /api/exam-scheduler/:id - Get single schedule
 * - PATCH /api/exam-scheduler/:id - Update schedule (Admin)
 * - DELETE /api/exam-scheduler/:id - Delete schedule (Admin)
 */
@Controller('exam-scheduler')
@UseGuards(JwtAuthGuard, RolesGuard, CenterSuperintendentGuard)
export class ExamSchedulerController {
  constructor(private readonly examSchedulerService: ExamSchedulerService) { }

  /**
   * Create a new exam schedule entry.
   * Admin only.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(
    @Body() createDto: CreateExamScheduleDto,
    @CurrentUser() user: User,
  ) {
    const schedule = await this.examSchedulerService.create(createDto, user.id);
    return {
      success: true,
      message: 'Exam schedule created successfully',
      data: schedule,
    };
  }

  /**
   * Bulk create exam schedule entries.
   * Admin only.
   */
  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createBulk(
    @Body() body: BulkCreateExamScheduleDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.examSchedulerService.createBulk(body.schedules, user.id);
    return {
      success: true,
      message: `Created ${result.created} schedules, skipped ${result.skipped} duplicates`,
      data: result,
    };
  }

  /**
   * Get all exam schedules with optional filters.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
  async findAll(
    @Query('date') examDate?: string,
    @Query('class') examClass?: ExamClass,
    @Query('category') category?: SubjectCategory,
    @Query('active') active?: string,
  ) {
    const schedules = await this.examSchedulerService.findAll({
      exam_date: examDate,
      class: examClass,
      subject_category: category,
      is_active: active !== undefined ? active === 'true' : undefined,
    });

    return {
      success: true,
      data: schedules,
    };
  }

  /**
   * Check if today is an exam day for the current Center Superintendent.
   * Used by mobile app to show locked/unlocked QPT state.
   * GET /api/exam-scheduler/exam-day-status
   */
  @Get('exam-day-status')
  @Roles(UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getExamDayStatus(
    @CurrentUser() user: User,
  ) {
    // Admins always have access
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return {
        success: true,
        data: { isExamDay: true, nextExamDate: null, todaySchedules: [] },
      };
    }

    const examCenterId = await this.examSchedulerService.getExamCenterForSuperintendent(user.id);

    if (!examCenterId) {
      return {
        success: true,
        data: { isExamDay: false, nextExamDate: null, todaySchedules: [] },
      };
    }

    const result = await this.examSchedulerService.isExamDayForCenter(examCenterId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get time windows for QPT tracker events on a specific date.
   * Used by mobile app to show allowed time windows and enforce restrictions.
   */
  @Get('time-windows')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
  async getTimeWindows(
    @Query('date') examDate?: string,
  ) {
    const date = examDate || new Date().toISOString().split('T')[0];
    const subjectCategory = await this.examSchedulerService.getSubjectCategoryForDate(date);
    const timeWindows = this.examSchedulerService.getTimeWindows(subjectCategory);
    const schedules = await this.examSchedulerService.getScheduleByDate(date);

    return {
      success: true,
      data: {
        exam_date: date,
        subject_category: subjectCategory,
        schedules,
        time_windows: timeWindows,
        bypass_time_check: process.env.NODE_ENV === 'testing',
      },
    };
  }

  /**
   * Validate if current time allows an event submission.
   * Used before photo upload to show proper error message.
   */
  @Get('validate-time')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
  async validateTime(
    @Query('date') examDate: string,
    @Query('eventType') eventType: string,
  ) {
    const subjectCategory = await this.examSchedulerService.getSubjectCategoryForDate(examDate);
    const result = this.examSchedulerService.isWithinTimeWindow(eventType, subjectCategory);

    return {
      success: true,
      data: {
        ...result,
        subject_category: subjectCategory,
      },
    };
  }

  /**
   * Get a single schedule by ID.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.HEADMASTER, UserRole.TEACHER)
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const schedule = await this.examSchedulerService.findById(id);
    return {
      success: true,
      data: schedule,
    };
  }

  /**
   * Update an exam schedule.
   * Admin only.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateExamScheduleDto,
  ) {
    const schedule = await this.examSchedulerService.update(id, updateDto);
    return {
      success: true,
      message: 'Exam schedule updated successfully',
      data: schedule,
    };
  }

  /**
   * Delete an exam schedule.
   * Admin only.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.examSchedulerService.remove(id);
    return {
      success: true,
      message: 'Exam schedule deleted successfully',
    };
  }
}
