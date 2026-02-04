import { Request } from 'express';
import { AuthService, LoginResponse, RegisterResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly usersService;
    constructor(authService: AuthService, usersService: UsersService);
    login(loginDto: LoginDto, request: Request): Promise<LoginResponse>;
    register(registerDto: RegisterDto, request: Request): Promise<RegisterResponse>;
    adminLogin(loginDto: LoginDto, request: Request): Promise<LoginResponse>;
    private extractIpAddress;
    getMe(request: Request): Promise<{
        id: any;
        name: any;
        email: any;
        phone: any;
        role: any;
        gender: any;
        profile_image_url: any;
        is_active: any;
    }>;
    logout(request: Request): Promise<{
        message: string;
    }>;
    uploadProfileImage(image: Express.Multer.File): Promise<{
        url: string;
    }>;
}
