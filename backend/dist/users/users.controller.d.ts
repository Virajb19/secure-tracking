import { Request } from 'express';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { AppwriteService } from '../appwrite/appwrite.service';
export declare class UsersController {
    private readonly usersService;
    private readonly appwriteService;
    constructor(usersService: UsersService, appwriteService: AppwriteService);
    create(createUserDto: CreateUserDto, currentUser: User, request: Request): Promise<User>;
    findAll(page?: string, limit?: string, role?: string, district_id?: string, school_id?: string, class_level?: string, subject?: string, search?: string, is_active?: string, approval_status?: string, exclude_roles?: string): Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    toggleStatus(userId: string, toggleStatusDto: ToggleUserStatusDto, currentUser: User, request: Request): Promise<User>;
    uploadProfilePhoto(file: Express.Multer.File, currentUser: User, request: Request): Promise<{
        user: User;
        photoUrl: string;
    }>;
    updateProfilePhoto(body: {
        profile_image_url: string;
    }, currentUser: User, request: Request): Promise<User>;
    resetDevice(userId: string, currentUser: User, request: Request): Promise<User>;
    getTeachingAssignments(userId: string): Promise<{
        class_level: number;
        subject: string;
    }[]>;
    approveUser(userId: string, body: {
        status: 'APPROVED' | 'REJECTED';
        rejection_reason?: string;
    }, currentUser: User, request: Request): Promise<{
        name: string;
        id: string;
        email: string | null;
        password: string;
        phone: string;
        role: import("@prisma/client").$Enums.UserRole;
        gender: import("@prisma/client").$Enums.Gender | null;
        profile_image_url: string | null;
        device_id: string | null;
        is_active: boolean;
        created_at: Date;
        push_token: string | null;
        coordinator_subject: string | null;
        coordinator_class: number | null;
    }>;
    private extractIpAddress;
}
