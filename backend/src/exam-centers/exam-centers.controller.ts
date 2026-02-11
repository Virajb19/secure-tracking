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
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { ExamCentersService } from './exam-centers.service';
import { CreateExamCenterDto, OverrideSuperintendentDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';

/**
 * Exam Centers Controller.
 *
 * Admin-only endpoints for managing exam centers and
 * Center Superintendent assignments.
 *
 * API Endpoints:
 * - POST   /api/admin/exam-centers              - Designate a school as exam center (headmaster auto-becomes CS)
 * - GET    /api/admin/exam-centers              - List all exam centers
 * - GET    /api/admin/exam-centers/:id          - Get a single exam center
 * - PATCH  /api/admin/exam-centers/:id/superintendent - Override CS assignment (by email)
 * - PATCH  /api/admin/exam-centers/:id/deactivate     - Deactivate an exam center
 * - DELETE /api/admin/exam-centers/:id          - Delete an exam center
 */
@Controller('admin/exam-centers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ExamCentersController {
  constructor(private readonly examCentersService: ExamCentersService) {}

  /**
   * Designate a school as an exam center.
   * The headmaster auto-becomes Center Superintendent.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateExamCenterDto,
    @CurrentUser() currentUser: User,
    @Req() request: Request,
  ) {
    const ipAddress = this.extractIpAddress(request);
    const center = await this.examCentersService.createExamCenter(
      createDto.school_id,
      currentUser.id,
      ipAddress,
    );

    return {
      success: true,
      message: 'Exam center created. Headmaster assigned as Center Superintendent.',
      data: center,
    };
  }

  /**
   * List all exam centers with pagination and filters.
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('district_id') district_id?: string,
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
  ) {
    return this.examCentersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      district_id,
      search,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
    });
  }

  /**
   * Get a single exam center.
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const center = await this.examCentersService.findOne(id);
    return { success: true, data: center };
  }

  /**
   * Override the Center Superintendent for an exam center.
   * Provide the email of the new CS. Previous CS loses access.
   */
  @Patch(':id/superintendent')
  @HttpCode(HttpStatus.OK)
  async overrideSuperintendent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() overrideDto: OverrideSuperintendentDto,
    @CurrentUser() currentUser: User,
    @Req() request: Request,
  ) {
    const ipAddress = this.extractIpAddress(request);
    const center = await this.examCentersService.overrideSuperintendent(
      id,
      overrideDto.email,
      currentUser.id,
      ipAddress,
    );

    return {
      success: true,
      message: 'Center Superintendent reassigned successfully.',
      data: center,
    };
  }

  /**
   * Deactivate an exam center (soft delete).
   */
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
    @Req() request: Request,
  ) {
    const ipAddress = this.extractIpAddress(request);
    return this.examCentersService.deactivate(id, currentUser.id, ipAddress);
  }

  /**
   * Delete an exam center permanently.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
    @Req() request: Request,
  ) {
    const ipAddress = this.extractIpAddress(request);
    return this.examCentersService.remove(id, currentUser.id, ipAddress);
  }

  private extractIpAddress(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedIps = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return forwardedIps.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
