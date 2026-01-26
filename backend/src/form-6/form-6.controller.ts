import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    Ip,
} from '@nestjs/common';
import { User, UserRole, ApprovalStatus } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { Form6Service } from './form-6.service';

@Controller('form-6')
@UseGuards(JwtAuthGuard, RolesGuard)
export class Form6Controller {
    constructor(private readonly form6Service: Form6Service) {}

    /**
     * GET /form-6/teaching-staff-lower
     * Get teaching staff for Pre-Primary to Class 10 (Form 6A).
     */
    @Get('teaching-staff-lower')
    @Roles(UserRole.HEADMASTER)
    async getTeachingStaffLower(@CurrentUser() user: User) {
        return this.form6Service.getTeachingStaffLower(user.id);
    }

    /**
     * GET /form-6/teaching-staff-higher
     * Get teaching staff for Class 11 & 12 (Form 6D).
     */
    @Get('teaching-staff-higher')
    @Roles(UserRole.HEADMASTER)
    async getTeachingStaffHigher(@CurrentUser() user: User) {
        return this.form6Service.getTeachingStaffHigher(user.id);
    }

    /**
     * PATCH /form-6/verify-faculty/:id
     * Verify or reject a faculty member.
     */
    @Patch('verify-faculty/:id')
    @Roles(UserRole.HEADMASTER)
    async verifyFaculty(
        @CurrentUser() user: User,
        @Param('id') facultyId: string,
        @Body() body: { status: ApprovalStatus },
        @Ip() ip: string | null,
    ) {
        return this.form6Service.verifyFaculty(user.id, facultyId, body.status, ip);
    }

    /**
     * POST /form-6/submit-6a
     * Submit Form 6A.
     */
    @Post('submit-6a')
    @Roles(UserRole.HEADMASTER)
    async submitForm6A(@CurrentUser() user: User, @Ip() ip: string | null) {
        return this.form6Service.submitForm6A(user.id, ip);
    }

    /**
     * GET /form-6/non-teaching-staff
     * Get non-teaching staff list (Form 6B).
     */
    @Get('non-teaching-staff')
    @Roles(UserRole.HEADMASTER)
    async getNonTeachingStaff(@CurrentUser() user: User) {
        return this.form6Service.getNonTeachingStaff(user.id);
    }

    /**
     * POST /form-6/non-teaching-staff
     * Add non-teaching staff member.
     */
    @Post('non-teaching-staff')
    @Roles(UserRole.HEADMASTER)
    async addNonTeachingStaff(
        @CurrentUser() user: User,
        @Body()
        body: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        },
        @Ip() ip: string | null,
    ) {
        return this.form6Service.saveNonTeachingStaff(user.id, body, ip);
    }

    /**
     * PATCH /form-6/non-teaching-staff/:id
     * Update non-teaching staff member.
     */
    @Patch('non-teaching-staff/:id')
    @Roles(UserRole.HEADMASTER)
    async updateNonTeachingStaff(
        @CurrentUser() user: User,
        @Param('id') staffId: string,
        @Body()
        body: {
            full_name: string;
            qualification: string;
            nature_of_work: string;
            years_of_service: number;
            phone: string;
        },
        @Ip() ip: string | null,
    ) {
        return this.form6Service.updateNonTeachingStaff(user.id, staffId, body, ip);
    }

    /**
     * POST /form-6/submit-6b
     * Submit Form 6B.
     */
    @Post('submit-6b')
    @Roles(UserRole.HEADMASTER)
    async submitForm6B(@CurrentUser() user: User, @Ip() ip: string | null) {
        return this.form6Service.submitForm6B(user.id, ip);
    }

    /**
     * GET /form-6/student-strength-lower
     * Get student strength for Pre-Primary to Class 10 (Form 6C lower).
     */
    @Get('student-strength-lower')
    @Roles(UserRole.HEADMASTER)
    async getStudentStrengthLower(@CurrentUser() user: User) {
        return this.form6Service.getStudentStrengthLower(user.id);
    }

    /**
     * POST /form-6/submit-6c-lower
     * Submit student strength for lower classes.
     */
    @Post('submit-6c-lower')
    @Roles(UserRole.HEADMASTER)
    async submitStudentStrengthLower(
        @CurrentUser() user: User,
        @Body()
        body: {
            strengths: Array<{
                class_level: number;
                boys: number;
                girls: number;
                sections: number;
            }>;
        },
        @Ip() ip: string | null,
    ) {
        return this.form6Service.submitStudentStrengthLower(user.id, body.strengths, ip);
    }

    /**
     * GET /form-6/student-strength-higher
     * Get student strength for Class 11 & 12 (Form 6C higher).
     */
    @Get('student-strength-higher')
    @Roles(UserRole.HEADMASTER)
    async getStudentStrengthHigher(@CurrentUser() user: User) {
        return this.form6Service.getStudentStrengthHigher(user.id);
    }

    /**
     * POST /form-6/submit-6c-higher
     * Submit student strength for higher classes.
     */
    @Post('submit-6c-higher')
    @Roles(UserRole.HEADMASTER)
    async submitStudentStrengthHigher(
        @CurrentUser() user: User,
        @Body()
        body: {
            strengths: Array<{
                class_level: number;
                stream?: string;
                boys: number;
                girls: number;
                sections: number;
            }>;
        },
        @Ip() ip: string | null,
    ) {
        return this.form6Service.submitStudentStrengthHigher(user.id, body.strengths, ip);
    }

    /**
     * POST /form-6/submit-6d
     * Submit Form 6D.
     */
    @Post('submit-6d')
    @Roles(UserRole.HEADMASTER)
    async submitForm6D(@CurrentUser() user: User, @Ip() ip: string | null) {
        return this.form6Service.submitForm6D(user.id, ip);
    }

    /**
     * GET /form-6/school-staffs
     * Get all staff at the headmaster's school.
     */
    @Get('school-staffs')
    @Roles(UserRole.HEADMASTER)
    async getSchoolStaffs(@CurrentUser() user: User) {
        return this.form6Service.getSchoolStaffs(user.id);
    }
}
