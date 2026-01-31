import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
export interface JwtPayload {
    sub: string;
    phone: string;
    role: string;
    iat?: number;
    exp?: number;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: JwtPayload): Promise<{
        name: string;
        id: string;
        created_at: Date;
        email: string | null;
        password: string;
        phone: string;
        role: import("@prisma/client").$Enums.UserRole;
        gender: import("@prisma/client").$Enums.Gender | null;
        profile_image_url: string | null;
        device_id: string | null;
        is_active: boolean;
        push_token: string | null;
        coordinator_subject: string | null;
        coordinator_class: number | null;
    }>;
}
export {};
