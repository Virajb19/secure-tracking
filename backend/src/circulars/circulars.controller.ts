import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Ip,
    Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../shared/guards';
import { Roles, CurrentUser } from '../shared/decorators';
import { CircularsService } from './circulars.service';
import { DeleteCircularDto } from './dto/delete-circular.dto';
import { CreateCircularDto } from './dto/create-circular.dto';

@Controller('circulars')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CircularsController {
    constructor(private readonly circularsService: CircularsService) {}

    /**
     * GET /circulars
     * Get all active circulars.
     * Anyone authenticated can view circulars.
     */
    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SEBA_OFFICER, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async getCirculars(@CurrentUser() user: User) {
        return this.circularsService.getCirculars(user.id);
    }

    /**
     * GET /circulars/search?q=query
     * Search circulars by title or circular number.
     */
    @Get('search')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SEBA_OFFICER, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async searchCirculars(
        @CurrentUser() user: User,
        @Query('q') query: string,
    ) {
        return this.circularsService.searchCirculars(user.id, query || '');
    }

    /**
     * GET /circulars/:id
     * Get a single circular by ID.
     */
    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SEBA_OFFICER, UserRole.HEADMASTER, UserRole.TEACHER, UserRole.CENTER_SUPERINTENDENT)
    async getCircularById(@Param('id') circularId: string) {
        return this.circularsService.getCircularById(circularId);
    }

    /**
     * POST /circulars
     * Create a new circular (Admin only).
     * Supports multiple school_ids for targeting multiple schools.
     */
    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async createCircular(
        @CurrentUser() user: User,
        @Body() body: CreateCircularDto,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Ip() ip: string | null,
    ) {
        // Handle school_ids[] array from form-data (comes as 'school_ids[]' key)
        const rawBody = body as any;
        if (rawBody['school_ids[]']) {
            const schoolIds = Array.isArray(rawBody['school_ids[]']) 
                ? rawBody['school_ids[]'] 
                : [rawBody['school_ids[]']];
            body.school_ids = schoolIds;
        }
        
        return this.circularsService.createCircular(user.id, body, file, ip);
    }

    /**
     * POST /circulars/delete
     * Soft delete a circular (Admin only).
     */
    @Delete('delete/:id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    async deleteCircular(
    @CurrentUser() user: User,
    @Body() body: DeleteCircularDto,
    @Param('id') circularId: string,
    @Ip() ip: string | null,
    ) {
          return this.circularsService.deleteCircular(user.id, circularId, body.reason, ip);
    }

}
