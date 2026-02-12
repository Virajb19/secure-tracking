import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExamTrackerEvent, ExamTrackerEventType as PrismaExamTrackerEventType, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma';
import { CreateExamTrackerEventDto, ExamTrackerEventType } from './dto/create-exam-tracker-event.dto';
import { ExamSchedulerService } from '../exam-scheduler/exam-scheduler.service';

/**
 * Exam Tracker Service.
 * 
 * Handles exam center event tracking for Center Superintendents.
 * These events track the lifecycle of question papers at exam centers:
 * - Treasury arrival
 * - Custodian handover
 * - Question paper opening (per shift)
 * - Answer sheet packing (per shift)
 * - Post office delivery (per shift)
 * 
 * Time-frame restrictions are enforced based on exam scheduler.
 */
@Injectable()
export class ExamTrackerService {
  constructor(
    private readonly db: PrismaService,
    private readonly examSchedulerService: ExamSchedulerService,
  ) {}

  /**
   * Create a new exam tracker event.
   * 
   * SECURITY:
   * - Only users with is_center_superintendent flag can submit events
   * - User must have an associated school (exam center)
   * - Each event type can only be submitted once per exam date
   * - Image hash is calculated for integrity verification
   */
  async create(
    createDto: CreateExamTrackerEventDto,
    imageFile: Express.Multer.File,
    userId: string,
  ): Promise<ExamTrackerEvent> {
    // Get user and verify they are a Center Superintendent
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        faculty: {
          select: { school_id: true },
        },
        exam_center_assignment: {
          select: { school_id: true },
        },
      },
    });

    if (!user || !user.is_center_superintendent) {
      throw new ForbiddenException('You must be assigned as a Center Superintendent to submit tracker events');
    }

    // Use the exam center assignment school, falling back to faculty school
    const schoolId = user.exam_center_assignment?.school_id || user.faculty?.school_id;

    if (!schoolId) {
      throw new ForbiddenException('You must be associated with an exam center to submit tracker events');
    }
    const examDate = new Date(createDto.exam_date);

    // Check if this event type has already been submitted for this date
    const existingEvent = await this.db.examTrackerEvent.findUnique({
      where: {
        user_id_school_id_event_type_exam_date: {
          user_id: userId,
          school_id: schoolId,
          event_type: createDto.event_type as PrismaExamTrackerEventType,
          exam_date: examDate,
        },
      },
    });

    if (existingEvent) {
      throw new BadRequestException(
        `Event ${createDto.event_type} has already been submitted for ${createDto.exam_date}`,
      );
    }

    // Validate time window based on exam schedule
    const subjectCategory = await this.examSchedulerService.getSubjectCategoryForDate(createDto.exam_date);
    const timeValidation = this.examSchedulerService.isWithinTimeWindow(
      createDto.event_type,
      subjectCategory,
    );

    if (!timeValidation.allowed) {
      throw new BadRequestException(timeValidation.message);
    }

    // Calculate image hash for integrity
    const imageHash = crypto.createHash('sha256').update(imageFile.buffer).digest('hex');

    // Save image to disk
    const uploadsDir = path.join(process.cwd(), 'uploads', 'exam-tracker');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExtension = path.extname(imageFile.originalname) || '.jpg';
    const filename = `${userId}_${createDto.event_type}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, imageFile.buffer);

    // Construct relative URL for the image
    const imageUrl = `/uploads/exam-tracker/${filename}`;

    // Determine shift based on event type
    let shift = createDto.shift;
    if (!shift) {
      if (createDto.event_type.includes('MORNING')) {
        shift = 'MORNING';
      } else if (createDto.event_type.includes('AFTERNOON')) {
        shift = 'AFTERNOON';
      } else {
        shift = 'GENERAL';
      }
    }

    // Create the event
    const event = await this.db.examTrackerEvent.create({
      data: {
        user_id: userId,
        school_id: schoolId,
        event_type: createDto.event_type as PrismaExamTrackerEventType,
        exam_date: examDate,
        shift,
        image_url: imageUrl,
        image_hash: imageHash,
        latitude: new Decimal(createDto.latitude),
        longitude: new Decimal(createDto.longitude),
        captured_at: createDto.captured_at ? new Date(createDto.captured_at) : new Date(),
      },
    });

    return event;
  }

  /**
   * Get all tracker events for a school on a specific date.
   * Used by headmaster to view their exam center's status.
   */
  async getEventsBySchool(
    schoolId: string,
    examDate?: string,
  ): Promise<ExamTrackerEvent[]> {
    const whereClause: any = { school_id: schoolId };

    if (examDate) {
      whereClause.exam_date = new Date(examDate);
    }

    return this.db.examTrackerEvent.findMany({
      where: whereClause,
      orderBy: { submitted_at: 'desc' },
    });
  }

  /**
   * Get today's tracker events for the current user's school.
   * Used by headmaster to view their own exam center status.
   * Only accessible to Center Superintendents.
   */
  async getMySchoolEvents(userId: string, examDate?: string): Promise<{
    events: ExamTrackerEvent[];
    school_id: string;
    school_name: string;
  }> {
    // Get user's school
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        faculty: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!user || !user.faculty || !user.faculty.school_id) {
      throw new ForbiddenException('You must be associated with a school');
    }

    // Server-side check: user must be a Center Superintendent
    if (!user.is_center_superintendent) {
      throw new ForbiddenException('You must be assigned as a Center Superintendent to access Question Paper Tracking');
    }

    const schoolId = user.faculty.school_id;
    const schoolName = user.faculty.school.name;

    const events = await this.getEventsBySchool(
      schoolId,
      examDate || new Date().toISOString().split('T')[0],
    );

    return {
      events,
      school_id: schoolId,
      school_name: schoolName,
    };
  }

  /**
   * Get tracker events across all schools for admin.
   * Optionally filter by date and event type.
   */
  async getAllEvents(filters?: {
    examDate?: string;
    eventType?: ExamTrackerEventType;
    schoolId?: string;
  }): Promise<ExamTrackerEvent[]> {
    const whereClause: any = {};

    if (filters?.examDate) {
      whereClause.exam_date = new Date(filters.examDate);
    }

    if (filters?.eventType) {
      whereClause.event_type = filters.eventType;
    }

    if (filters?.schoolId) {
      whereClause.school_id = filters.schoolId;
    }

    return this.db.examTrackerEvent.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        school: {
          select: { id: true, name: true, registration_code: true },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });
  }

  /**
   * Get a single event by ID.
   */
  async getEventById(eventId: string): Promise<ExamTrackerEvent> {
    const event = await this.db.examTrackerEvent.findUnique({
      where: { id: eventId },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        school: {
          select: { id: true, name: true, registration_code: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  /**
   * Get a summary of all events for a school grouped by date.
   * Returns which events are completed and which are pending.
   * Includes time window information based on exam scheduler.
   */
  async getEventSummary(schoolId: string, examDate: string): Promise<{
    examDate: string;
    subjectCategory: string;
    completedEvents: ExamTrackerEventType[];
    pendingEvents: ExamTrackerEventType[];
    timeWindows: any;
    eventDetails: Record<string, {
      completed: boolean;
      submitted_at?: Date;
      image_url?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
    }>;
  }> {
    const allEventTypes = Object.values(ExamTrackerEventType);

    const events = await this.db.examTrackerEvent.findMany({
      where: {
        school_id: schoolId,
        exam_date: new Date(examDate),
      },
    });

    // Get subject category and time windows from scheduler
    const subjectCategory = await this.examSchedulerService.getSubjectCategoryForDate(examDate);
    const timeWindows = this.examSchedulerService.getTimeWindows(subjectCategory);

    const completedEventTypes = events.map(e => e.event_type as string);
    const completedEvents = completedEventTypes as ExamTrackerEventType[];
    const pendingEvents = allEventTypes.filter(
      type => !completedEventTypes.includes(type),
    );

    const eventDetails: Record<string, { completed: boolean; submitted_at?: Date; image_url?: string; latitude?: number; longitude?: number }> = {};

    for (const type of allEventTypes) {
      const event = events.find(e => e.event_type === type);
      eventDetails[type] = {
        completed: !!event,
        submitted_at: event?.submitted_at,
        image_url: event?.image_url,
        latitude: event?.latitude ? Number(event.latitude) : undefined,
        longitude: event?.longitude ? Number(event.longitude) : undefined,
      };
    }

    return {
      examDate,
      subjectCategory,
      completedEvents,
      pendingEvents,
      timeWindows,
      eventDetails,
    };
  }
}
