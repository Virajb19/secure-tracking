import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

/**
 * Exam Centers Service.
 *
 * Manages exam center designations and Center Superintendent assignments.
 *
 * BUSINESS RULES:
 * - When a school is selected as an exam center, its headmaster
 *   automatically becomes the Center Superintendent.
 * - Admin can override the CS by providing a different user's email.
 * - When overridden, the previous CS loses access (is_center_superintendent = false).
 * - A user can be both Teacher/Headmaster AND Center Superintendent.
 * - Only one CS per exam center at any time.
 */
@Injectable()
export class ExamCentersService {
  constructor(
    private readonly db: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create an exam center by designating a school.
   * The headmaster of the school auto-becomes Center Superintendent.
   *
   * @param schoolId - School to designate as exam center
   * @param adminId - Admin performing the action
   * @param ipAddress - Client IP for audit logging
   */
  async createExamCenter(
    schoolId: string,
    adminId: string,
    ipAddress: string | null,
  ) {
    // Check if school exists
    const school = await this.db.school.findUnique({
      where: { id: schoolId },
      include: { district: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if this school is already an exam center
    const existing = await this.db.examCenter.findUnique({
      where: { school_id: schoolId },
    });

    if (existing) {
      throw new ConflictException('This school is already designated as an exam center');
    }

    // Find the headmaster of this school
    const headmasterFaculty = await this.db.faculty.findFirst({
      where: {
        school_id: schoolId,
        user: { role: UserRole.HEADMASTER, is_active: true },
      },
      include: { user: true },
    });

    if (!headmasterFaculty) {
      throw new BadRequestException(
        'No active headmaster found for this school. A headmaster must be registered first.',
      );
    }

    const superintendentId = headmasterFaculty.user_id;

    // Use transaction to ensure atomicity
    const examCenter = await this.db.$transaction(async (tx) => {
      // Set the user as center superintendent
      await tx.user.update({
        where: { id: superintendentId },
        data: { is_center_superintendent: true },
      });

      // Create the exam center record
      const center = await tx.examCenter.create({
        data: {
          school_id: schoolId,
          superintendent_id: superintendentId,
          assigned_by: adminId,
        },
        include: {
          school: { include: { district: true } },
          superintendent: {
            select: { id: true, name: true, email: true, phone: true, role: true },
          },
        },
      });

      return center;
    });

    // Audit log
    await this.auditLogsService.log(
      'EXAM_CENTER_CREATED',
      'ExamCenter',
      examCenter.id,
      adminId,
      ipAddress,
    );

    // Notify the superintendent
    try {
      await this.notificationsService.sendToUser({
        userId: superintendentId,
        title: 'Center Superintendent Assigned',
        body: `You have been assigned as Center Superintendent for ${school.name}. A new "Question Paper Tracking" tab is now available.`,
        type: NotificationType.GENERAL,
      });
    } catch (e) {
      // Don't fail the operation if notification fails
      console.error('Failed to send CS assignment notification:', e);
    }

    return examCenter;
  }

  /**
   * Override the Center Superintendent for an exam center.
   * The new CS is identified by email. Previous CS loses access.
   *
   * @param examCenterId - Exam center to update
   * @param newCsEmail - Email of the new Center Superintendent
   * @param adminId - Admin performing the action
   * @param ipAddress - Client IP for audit logging
   */
  async overrideSuperintendent(
    examCenterId: string,
    newCsEmail: string,
    adminId: string,
    ipAddress: string | null,
  ) {
    // Find the exam center
    const examCenter = await this.db.examCenter.findUnique({
      where: { id: examCenterId },
      include: {
        school: true,
        superintendent: { select: { id: true, name: true, email: true } },
      },
    });

    if (!examCenter) {
      throw new NotFoundException('Exam center not found');
    }

    // Find the new CS by email
    const newCs = await this.db.user.findUnique({
      where: { email: newCsEmail },
      include: { faculty: true },
    });

    if (!newCs) {
      throw new NotFoundException(`No user found with email: ${newCsEmail}`);
    }

    // Validate: only TEACHER or HEADMASTER can be CS
    if (newCs.role !== UserRole.TEACHER && newCs.role !== UserRole.HEADMASTER) {
      throw new BadRequestException(
        'Only a Teacher or Headmaster can be assigned as Center Superintendent',
      );
    }

    if (!newCs.is_active) {
      throw new BadRequestException('The user account is not active');
    }

    // Check if new CS is already superintendent at another center
    const existingAssignment = await this.db.examCenter.findUnique({
      where: { superintendent_id: newCs.id },
    });

    if (existingAssignment && existingAssignment.id !== examCenterId) {
      throw new ConflictException(
        'This user is already assigned as Center Superintendent at another exam center',
      );
    }

    const previousCsId = examCenter.superintendent_id;

    // Use transaction to ensure atomicity
    const updatedCenter = await this.db.$transaction(async (tx) => {
      // Remove CS flag from previous superintendent
      await tx.user.update({
        where: { id: previousCsId },
        data: { is_center_superintendent: false },
      });

      // Set CS flag on new superintendent
      await tx.user.update({
        where: { id: newCs.id },
        data: { is_center_superintendent: true },
      });

      // Update the exam center record
      const center = await tx.examCenter.update({
        where: { id: examCenterId },
        data: {
          superintendent_id: newCs.id,
          assigned_by: adminId,
        },
        include: {
          school: { include: { district: true } },
          superintendent: {
            select: { id: true, name: true, email: true, phone: true, role: true },
          },
        },
      });

      return center;
    });

    // Audit log
    await this.auditLogsService.log(
      'EXAM_CENTER_CS_OVERRIDDEN',
      'ExamCenter',
      examCenterId,
      adminId,
      ipAddress,
    );

    // Notify previous CS
    try {
      await this.notificationsService.sendToUser({
        userId: previousCsId,
        title: 'Center Superintendent Role Removed',
        body: `Your Center Superintendent role for ${examCenter.school.name} has been reassigned.`,
        type: NotificationType.GENERAL,
      });
    } catch (e) {
      console.error('Failed to notify previous CS:', e);
    }

    // Notify new CS
    try {
      await this.notificationsService.sendToUser({
        userId: newCs.id,
        title: 'Center Superintendent Assigned',
        body: `You have been assigned as Center Superintendent for ${examCenter.school.name}. A new "Question Paper Tracking" tab is now available.`,
        type: NotificationType.GENERAL,
      });
    } catch (e) {
      console.error('Failed to notify new CS:', e);
    }

    return updatedCenter;
  }

  /**
   * List all exam centers with their superintendents.
   */
  async findAll(params: {
    page: number;
    limit: number;
    district_id?: string;
    search?: string;
    is_active?: boolean;
  }) {
    const { page, limit, district_id, search, is_active } = params;

    const where: any = {};

    if (district_id) {
      where.school = { district_id };
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { school: { name: { contains: search, mode: 'insensitive' } } },
        { superintendent: { name: { contains: search, mode: 'insensitive' } } },
        { superintendent: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.examCenter.findMany({
        where,
        include: {
          school: { include: { district: true } },
          superintendent: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              profile_image_url: true,
            },
          },
          assigned_admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.examCenter.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single exam center by ID.
   */
  async findOne(id: string) {
    const center = await this.db.examCenter.findUnique({
      where: { id },
      include: {
        school: { include: { district: true } },
        superintendent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            profile_image_url: true,
          },
        },
        assigned_admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!center) {
      throw new NotFoundException('Exam center not found');
    }

    return center;
  }

  /**
   * Deactivate an exam center.
   * Removes the CS flag from the superintendent.
   */
  async deactivate(
    examCenterId: string,
    adminId: string,
    ipAddress: string | null,
  ) {
    const examCenter = await this.db.examCenter.findUnique({
      where: { id: examCenterId },
    });

    if (!examCenter) {
      throw new NotFoundException('Exam center not found');
    }

    await this.db.$transaction(async (tx) => {
      // Remove CS flag from superintendent
      await tx.user.update({
        where: { id: examCenter.superintendent_id },
        data: { is_center_superintendent: false },
      });

      // Deactivate the exam center
      await tx.examCenter.update({
        where: { id: examCenterId },
        data: { is_active: false },
      });
    });

    // Audit log
    await this.auditLogsService.log(
      'EXAM_CENTER_DEACTIVATED',
      'ExamCenter',
      examCenterId,
      adminId,
      ipAddress,
    );

    return { success: true, message: 'Exam center deactivated' };
  }

  /**
   * Delete an exam center completely.
   * Removes the CS flag from the superintendent.
   */
  async remove(
    examCenterId: string,
    adminId: string,
    ipAddress: string | null,
  ) {
    const examCenter = await this.db.examCenter.findUnique({
      where: { id: examCenterId },
    });

    if (!examCenter) {
      throw new NotFoundException('Exam center not found');
    }

    await this.db.$transaction(async (tx) => {
      // Remove CS flag from superintendent
      await tx.user.update({
        where: { id: examCenter.superintendent_id },
        data: { is_center_superintendent: false },
      });

      // Delete the exam center
      await tx.examCenter.delete({
        where: { id: examCenterId },
      });
    });

    // Audit log
    await this.auditLogsService.log(
      'EXAM_CENTER_DELETED',
      'ExamCenter',
      examCenterId,
      adminId,
      ipAddress,
    );

    return { success: true, message: 'Exam center deleted' };
  }
}
