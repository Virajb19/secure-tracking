import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import { User, UserRole, FormSubmissionStatus } from '@prisma/client';
import { FormSubmissionsService } from './form-submissions.service';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';

/**
 * Form Submissions Controller
 * 
 * Endpoints:
 * - POST /form-submissions - Create a new form
 * - POST /form-submissions/:id/submit - Submit for approval
 * - POST /form-submissions/:id/approve - Admin approve
 * - POST /form-submissions/:id/reject - Admin reject
 * - GET /form-submissions/my - Get user's forms
 * - GET /form-submissions/pending - Get pending forms (admin)
 */
@Controller('form-submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormSubmissionsController {
    constructor(private readonly formSubmissionsService: FormSubmissionsService) {}

    /**
     * Create a new form submission
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser() user: User,
        @Body() body: {
            schoolId: string;
            formType: string;
            submit?: boolean;
        },
    ) {
        const status = body.submit 
            ? FormSubmissionStatus.SUBMITTED 
            : FormSubmissionStatus.DRAFT;
        
        return this.formSubmissionsService.create(
            body.schoolId,
            user.id,
            body.formType,
            status,
        );
    }

    /**
     * Get current user's form submissions
     */
    @Get('my')
    async getMyForms(
        @CurrentUser() user: User,
        @Query('status') status?: FormSubmissionStatus,
    ) {
        return this.formSubmissionsService.findByUser(user.id, status);
    }

    /**
     * Get forms for a specific school
     */
    @Get('school/:schoolId')
    async getSchoolForms(
        @Param('schoolId', new ParseUUIDPipe({ version: '4' })) schoolId: string,
    ) {
        return this.formSubmissionsService.findBySchool(schoolId);
    }

    /**
     * Get a specific form submission
     */
    @Get(':id')
    async getForm(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.formSubmissionsService.findById(id);
    }

    /**
     * Submit a draft form for approval
     */
    @Post(':id/submit')
    @HttpCode(HttpStatus.OK)
    async submit(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @CurrentUser() user: User,
    ) {
        return this.formSubmissionsService.submit(id, user.id);
    }

    /**
     * Resubmit a rejected form
     */
    @Post(':id/resubmit')
    @HttpCode(HttpStatus.OK)
    async resubmit(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @CurrentUser() user: User,
    ) {
        return this.formSubmissionsService.resubmit(id, user.id);
    }

    /**
     * Delete a draft form
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteDraft(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @CurrentUser() user: User,
    ) {
        await this.formSubmissionsService.deleteDraft(id, user.id);
    }

    // ===========================
    // ADMIN ENDPOINTS
    // ===========================

    /**
     * Get pending form submissions (admin only)
     */
    @Get('admin/pending')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getPending(
        @Query('formType') formType?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('districtId') districtId?: string,
    ) {
        return this.formSubmissionsService.findPending(
            formType,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20,
            districtId,
        );
    }

    /**
     * Get all form submissions with optional filters (admin only)
     */
    @Get('admin/all')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getAll(
        @Query('formType') formType?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('districtId') districtId?: string,
        @Query('status') status?: string,
    ) {
        return this.formSubmissionsService.findAll(
            formType,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20,
            districtId,
            status as FormSubmissionStatus | undefined,
        );
    }

    /**
     * Approve a form submission (admin only)
     */
    @Post(':id/approve')
    @HttpCode(HttpStatus.OK)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async approve(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @CurrentUser() admin: User,
    ) {
        return this.formSubmissionsService.approve(id, admin.id);
    }

    /**
     * Reject a form submission (admin only)
     */
    @Post(':id/reject')
    @HttpCode(HttpStatus.OK)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async reject(
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @CurrentUser() admin: User,
        @Body() body: { reason: string },
    ) {
        return this.formSubmissionsService.reject(id, admin.id, body.reason);
    }
}
