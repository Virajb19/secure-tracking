import { Request } from 'express';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto, currentUser: User, request: Request): Promise<User>;
    findAll(page?: string, limit?: string, role?: string, district_id?: string, school_id?: string, class_level?: string, subject?: string, search?: string, is_active?: string): Promise<{
        data: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    toggleStatus(userId: string, toggleStatusDto: ToggleUserStatusDto, currentUser: User, request: Request): Promise<User>;
    getTeachingAssignments(userId: string): Promise<{
        class_level: number;
        subject: string;
    }[]>;
    private extractIpAddress;
}
