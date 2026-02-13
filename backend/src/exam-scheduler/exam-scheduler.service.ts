import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ExamSchedule, SubjectCategory as PrismaSubjectCategory, ExamClass as PrismaExamClass } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateExamScheduleDto, UpdateExamScheduleDto, SubjectCategory, ExamClass } from './dto/create-exam-schedule.dto';

/**
 * Time windows for QPT tracker events.
 * These vary based on subject category (CORE vs VOCATIONAL).
 * 
 * CORE subject (3 hours: 9:00 AM - 12:00 PM):
 * - Packing/Sealing: 12:00 PM - 2:00 PM
 * - Post Office Delivery: 12:00 PM - 2:00 PM
 * 
 * VOCATIONAL subject (2 hours: 9:00 AM - 11:00 AM):
 * - Packing/Sealing: 11:00 AM - 2:00 PM  
 * - Post Office Delivery: 11:00 AM - 2:00 PM
 */
export interface TimeWindow {
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  label: string;
}

export interface TrackerTimeWindows {
  TREASURY_ARRIVAL: TimeWindow;
  CUSTODIAN_HANDOVER: TimeWindow;
  OPENING: TimeWindow;
  PACKING: TimeWindow;
  DELIVERY: TimeWindow;
}

@Injectable()
export class ExamSchedulerService {
  constructor(private readonly db: PrismaService) { }

  /**
   * Get time windows for tracker events based on exam schedule for a date.
   * If vocational subject, packing/delivery starts at 11:00 AM.
   * If core subject, packing/delivery starts at 12:00 PM.
   */
  getTimeWindows(subjectCategory: SubjectCategory | string): TrackerTimeWindows {
    const isVocational = subjectCategory === SubjectCategory.VOCATIONAL || subjectCategory === 'VOCATIONAL';

    return {
      TREASURY_ARRIVAL: {
        start_hour: 7, start_minute: 30,
        end_hour: 8, end_minute: 40,
        label: '7:30 AM to 8:40 AM',
      },
      CUSTODIAN_HANDOVER: {
        start_hour: 7, start_minute: 30,
        end_hour: 8, end_minute: 40,
        label: '7:30 AM to 8:40 AM',
      },
      OPENING: {
        start_hour: 8, start_minute: 30,
        end_hour: 9, end_minute: 0,
        label: '8:30 AM to 9:00 AM',
      },
      PACKING: {
        start_hour: isVocational ? 11 : 12, start_minute: 0,
        end_hour: 14, end_minute: 0,
        label: isVocational ? '11:00 AM to 2:00 PM' : '12:00 Noon to 2:00 PM',
      },
      DELIVERY: {
        start_hour: isVocational ? 11 : 12, start_minute: 0,
        end_hour: 14, end_minute: 0,
        label: isVocational ? '11:00 AM to 2:00 PM' : '12:00 Noon to 2:00 PM',
      },
    };
  }

  /**
   * Check if current time is within allowed window for a tracker event type.
   */
  isWithinTimeWindow(
    eventType: string,
    subjectCategory: SubjectCategory | string,
    currentTime?: Date,
  ): { allowed: boolean; timeWindow: TimeWindow; message: string } {
    const now = currentTime || new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const windows = this.getTimeWindows(subjectCategory);

    // Map exam tracker event types to time window keys
    let windowKey: keyof TrackerTimeWindows;
    switch (eventType) {
      case 'TREASURY_ARRIVAL':
        windowKey = 'TREASURY_ARRIVAL';
        break;
      case 'CUSTODIAN_HANDOVER':
        windowKey = 'CUSTODIAN_HANDOVER';
        break;
      case 'OPENING_MORNING':
      case 'OPENING_AFTERNOON':
        windowKey = 'OPENING';
        break;
      case 'PACKING_MORNING':
      case 'PACKING_AFTERNOON':
        windowKey = 'PACKING';
        break;
      case 'DELIVERY_MORNING':
      case 'DELIVERY_AFTERNOON':
        windowKey = 'DELIVERY';
        break;
      default:
        windowKey = 'TREASURY_ARRIVAL';
    }

    const window = windows[windowKey];
    const windowStart = window.start_hour * 60 + window.start_minute;
    const windowEnd = window.end_hour * 60 + window.end_minute;

    const allowed = currentMinutes >= windowStart && currentMinutes <= windowEnd;

    return {
      allowed,
      timeWindow: window,
      message: allowed
        ? `Within allowed time window: ${window.label}`
        : `This event can only be submitted between ${window.label}. Current time is outside the allowed window.`,
    };
  }

  /**
   * Get exam schedule for a specific date.
   */
  async getScheduleByDate(examDate: string): Promise<ExamSchedule[]> {
    return this.db.examSchedule.findMany({
      where: {
        exam_date: new Date(examDate),
        is_active: true,
      },
      orderBy: [
        { class: 'asc' },
        { subject: 'asc' },
      ],
    });
  }

  /**
   * Get the subject category for a date.
   * If multiple exams on the same date, use the one that affects time windows.
   * For vocational subjects, packing/delivery starts earlier.
   */
  async getSubjectCategoryForDate(examDate: string): Promise<SubjectCategory> {
    const schedules = await this.getScheduleByDate(examDate);

    if (schedules.length === 0) {
      // Default to CORE if no schedule found
      return SubjectCategory.CORE;
    }

    // If any exam on this date is vocational, use vocational timing
    // (earlier packing/delivery is more permissive)
    const hasVocational = schedules.some(
      s => s.subject_category === 'VOCATIONAL',
    );

    return hasVocational ? SubjectCategory.VOCATIONAL : SubjectCategory.CORE;
  }

  /**
   * Validate that a specific exam center exists and is active.
   */
  private async validateExamCenter(examCenterId: string): Promise<void> {
    const center = await this.db.examCenter.findUnique({
      where: { id: examCenterId },
    });

    if (!center) {
      throw new BadRequestException(
        'Exam center not found. Please select a valid exam center.',
      );
    }

    if (!center.is_active) {
      throw new BadRequestException(
        'The selected exam center is inactive. Only active exam centers can have exams scheduled.',
      );
    }
  }

  /**
   * Validate that the exam center does not already have the same subject
   * scheduled on the same date for the same class.
   */
  private async validateNoDuplicateSchedule(
    examCenterId: string,
    examDate: string,
    examClass: string,
    subject: string,
    excludeId?: string,
  ): Promise<void> {
    const where: any = {
      exam_center_id: examCenterId,
      exam_date: new Date(examDate),
      class: examClass,
      subject,
      is_active: true,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.db.examSchedule.findFirst({ where });

    if (existing) {
      throw new ConflictException(
        `This exam center already has "${subject}" scheduled for ${examClass.replace('_', ' ')} on ${examDate}. Cannot schedule a duplicate.`,
      );
    }
  }

  /**
   * Create a new exam schedule entry.
   * Validates that the exam center is active and no duplicate schedule exists.
   */
  async create(createDto: CreateExamScheduleDto, userId?: string): Promise<ExamSchedule> {
    // Validate the specific exam center
    await this.validateExamCenter(createDto.exam_center_id);

    // Check for duplicate schedule at this exam center
    await this.validateNoDuplicateSchedule(
      createDto.exam_center_id,
      createDto.exam_date,
      createDto.class,
      createDto.subject,
    );

    // Set default times based on subject category
    const startTime = createDto.exam_start_time || '09:00';
    const endTime = createDto.exam_end_time || (
      createDto.subject_category === SubjectCategory.VOCATIONAL ? '11:00' : '12:00'
    );

    try {
      return await this.db.examSchedule.create({
        data: {
          exam_date: new Date(createDto.exam_date),
          class: createDto.class as unknown as PrismaExamClass,
          subject: createDto.subject,
          subject_category: createDto.subject_category as unknown as PrismaSubjectCategory,
          exam_start_time: startTime,
          exam_end_time: endTime,
          exam_center_id: createDto.exam_center_id,
          is_active: createDto.is_active ?? true,
          created_by: userId || null,
        },
        include: {
          exam_center: {
            include: {
              school: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `An exam is already scheduled on ${createDto.exam_date} for ${createDto.class} - ${createDto.subject} at this exam center`,
        );
      }
      throw error;
    }
  }

  /**
   * Bulk create exam schedule entries.
   * Validates each exam center individually.
   */
  async createBulk(entries: CreateExamScheduleDto[], userId?: string): Promise<{ created: number; skipped: number }> {

    let created = 0;
    let skipped = 0;

    for (const entry of entries) {
      try {
        await this.create(entry, userId);
        created++;
      } catch (error) {
        if (error instanceof ConflictException) {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    return { created, skipped };
  }

  /**
   * Get all exam schedules with optional filters.
   */
  async findAll(filters?: {
    exam_date?: string;
    class?: ExamClass;
    subject_category?: SubjectCategory;
    is_active?: boolean;
  }): Promise<ExamSchedule[]> {
    const where: any = {};

    if (filters?.exam_date) {
      where.exam_date = new Date(filters.exam_date);
    }
    if (filters?.class) {
      where.class = filters.class;
    }
    if (filters?.subject_category) {
      where.subject_category = filters.subject_category;
    }
    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.db.examSchedule.findMany({
      where,
      include: {
        exam_center: {
          include: {
            school: true,
          },
        },
      },
      orderBy: [
        { exam_date: 'asc' },
        { class: 'asc' },
        { subject: 'asc' },
      ],
    });
  }

  /**
   * Get a single schedule by ID.
   */
  async findById(id: string): Promise<ExamSchedule> {
    const schedule = await this.db.examSchedule.findUnique({
      where: { id },
      include: {
        exam_center: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Exam schedule not found');
    }

    return schedule;
  }

  /**
   * Update an exam schedule.
   */
  async update(id: string, updateDto: UpdateExamScheduleDto): Promise<ExamSchedule> {
    const existing = await this.findById(id); // Ensure it exists

    // If exam_center_id is being changed, validate the new one
    if (updateDto.exam_center_id && updateDto.exam_center_id !== (existing as any).exam_center_id) {
      await this.validateExamCenter(updateDto.exam_center_id);
    }

    const data: any = {};
    if (updateDto.exam_date) data.exam_date = new Date(updateDto.exam_date);
    if (updateDto.class) data.class = updateDto.class;
    if (updateDto.subject) data.subject = updateDto.subject;
    if (updateDto.subject_category) data.subject_category = updateDto.subject_category;
    if (updateDto.exam_start_time) data.exam_start_time = updateDto.exam_start_time;
    if (updateDto.exam_end_time) data.exam_end_time = updateDto.exam_end_time;
    if (updateDto.exam_center_id) data.exam_center_id = updateDto.exam_center_id;
    if (updateDto.is_active !== undefined) data.is_active = updateDto.is_active;

    return this.db.examSchedule.update({
      where: { id },
      data,
      include: {
        exam_center: {
          include: {
            school: true,
          },
        },
      },
    });
  }

  /**
   * Delete an exam schedule.
   */
  async remove(id: string): Promise<void> {
    await this.findById(id); // Ensure it exists
    await this.db.examSchedule.delete({ where: { id } });
  }

  /**
   * Check if today is an exam day for a specific exam center.
   * Used to enforce date-based access control for QPT.
   * Returns the exam date if access is allowed, null if not.
   */
  async isExamDayForCenter(examCenterId: string): Promise<{
    isExamDay: boolean;
    nextExamDate: string | null;
    todaySchedules: ExamSchedule[];
  }> {
    // Build today as UTC midnight from local date parts
    // This ensures correct comparison with @db.Date columns
    // (setHours(0,0,0,0) creates local midnight which in IST becomes previous day in UTC)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const today = new Date(todayStr + 'T00:00:00.000Z');

    // Check if there's an active exam scheduled for today at this center
    const todaySchedules = await this.db.examSchedule.findMany({
      where: {
        exam_center_id: examCenterId,
        exam_date: today,
        is_active: true,
      },
      orderBy: { exam_date: 'asc' },
    });

    if (todaySchedules.length > 0) {
      return {
        isExamDay: true,
        nextExamDate: today.toISOString().split('T')[0],
        todaySchedules,
      };
    }

    // Find the next upcoming exam date for this center
    const nextSchedule = await this.db.examSchedule.findFirst({
      where: {
        exam_center_id: examCenterId,
        exam_date: { gte: today },
        is_active: true,
      },
      orderBy: { exam_date: 'asc' },
    });

    return {
      isExamDay: false,
      nextExamDate: nextSchedule ? nextSchedule.exam_date.toISOString().split('T')[0] : null,
      todaySchedules: [],
    };
  }

  /**
   * Get the exam center ID for a Center Superintendent user.
   * Looks up by superintendent_id.
   */
  async getExamCenterForSuperintendent(userId: string): Promise<string | null> {
    const center = await this.db.examCenter.findUnique({
      where: { superintendent_id: userId },
    });
    return center?.id || null;
  }
}
