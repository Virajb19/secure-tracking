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
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User, UserRole, SelectionStatus } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { PaperSetterService } from './paper-setter.service';

/**
 * Paper Setter Controller
 * 
 * Endpoints for confidential paper setter selection system.
 */
@Controller('paper-setter')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaperSetterController {
    constructor(private readonly paperSetterService: PaperSetterService) {}

    /**
     * Search teachers for selection
     * GET /api/paper-setter/search?subject=Mathematics&classLevel=10
     */
    @Get('search')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async searchTeachers(
        @CurrentUser() user: User,
        @Query('subject') subject: string,
        @Query('classLevel') classLevel: string,
        @Query('districtId') districtId?: string,
        @Query('schoolId') schoolId?: string,
        @Query('search') search?: string,
    ) {
        return this.paperSetterService.searchTeachers(
            user.id,
            subject,
            parseInt(classLevel, 10),
            { districtId, schoolId, search },
        );
    }

    /**
     * Select a teacher as paper setter or examiner
     * POST /api/paper-setter/select
     */
    @Post('select')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async selectTeacher(
        @CurrentUser() user: User,
        @Body() body: {
            teacherId: string;
            subject: string;
            classLevel: number;
            selectionType: 'PAPER_SETTER' | 'EXAMINER';
            invitationMessage?: string;
        },
    ) {
        return this.paperSetterService.selectTeacher(user.id, body.teacherId, {
            subject: body.subject,
            classLevel: body.classLevel,
            selectionType: body.selectionType,
            invitationMessage: body.invitationMessage,
        });
    }

    /**
     * Get coordinator's selections
     * GET /api/paper-setter/my-selections
     */
    @Get('my-selections')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getMySelections(@CurrentUser() user: User) {
        return this.paperSetterService.getCoordinatorSelections(user.id);
    }

    /**
     * Get teacher's pending invitations
     * GET /api/paper-setter/invitations
     */
    @Get('invitations')
    @Roles(UserRole.TEACHER)
    async getMyInvitations(@CurrentUser() user: User) {
        return this.paperSetterService.getTeacherInvitations(user.id);
    }

    /**
     * Accept invitation (NO REJECT OPTION)
     * POST /api/paper-setter/accept/:id
     */
    @Post('accept/:id')
    @Roles(UserRole.TEACHER)
    async acceptInvitation(
        @CurrentUser() user: User,
        @Param('id') selectionId: string,
    ) {
        return this.paperSetterService.acceptInvitation(user.id, selectionId);
    }

    /**
     * Upload official order PDF
     * POST /api/paper-setter/:id/official-order
     */
    @Post(':id/official-order')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async uploadOfficialOrder(
        @CurrentUser() user: User,
        @Param('id') selectionId: string,
        @Body('fileUrl') fileUrl: string,
    ) {
        return this.paperSetterService.uploadOfficialOrder(user.id, selectionId, fileUrl);
    }

    /**
     * Get school selection count (for warning)
     * GET /api/paper-setter/school-count/:schoolId
     */
    @Get('school-count/:schoolId')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getSchoolCount(@Param('schoolId') schoolId: string) {
        return this.paperSetterService.getSchoolSelectionCount(schoolId);
    }

    /**
     * Get all selections (Admin view)
     * GET /api/paper-setter/all
     */
    @Get('all')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getAllSelections(
        @Query('subject') subject?: string,
        @Query('classLevel') classLevel?: string,
        @Query('status') status?: SelectionStatus,
        @Query('selectionType') selectionType?: 'PAPER_SETTER' | 'EXAMINER',
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.paperSetterService.getAllSelections({
            subject,
            classLevel: classLevel ? parseInt(classLevel, 10) : undefined,
            status,
            selectionType,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    /**
     * Get school-wise selection statistics
     * GET /api/paper-setter/school-wise
     */
    @Get('school-wise')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getSchoolWiseSelections(
        @Query('subject') subject?: string,
        @Query('status') status?: SelectionStatus,
        @Query('districtId') districtId?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.paperSetterService.getSchoolWiseSelections({
            subject,
            status,
            districtId,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        });
    }

    /**
     * Delete all selections for a school (Admin only)
     * DELETE /api/paper-setter/school/:schoolId
     */
    @Delete('school/:schoolId')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async deleteSchoolSelections(@Param('schoolId') schoolId: string) {
        const count = await this.paperSetterService.deleteSchoolSelections(schoolId);
        return { success: true, message: `${count} selections deleted`, deletedCount: count };
    }

    /**
     * Delete a selection (Admin only)
     * DELETE /api/paper-setter/:id
     */
    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async deleteSelection(@Param('id') selectionId: string) {
        await this.paperSetterService.deleteSelection(selectionId);
        return { success: true, message: 'Selection deleted' };
    }
}
