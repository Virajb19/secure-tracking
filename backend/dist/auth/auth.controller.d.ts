import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService, LoginResponse, RegisterResponse, RefreshResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly usersService;
    private readonly configService;
    constructor(authService: AuthService, usersService: UsersService, configService: ConfigService);
    private setRefreshTokenCookie;
    private clearRefreshTokenCookie;
    private setAccessTokenCookie;
    private clearAccessTokenCookie;
    private parseMaxAge;
    private parseAccessTokenMaxAge;
    login(loginDto: LoginDto, request: Request, res: Response): Promise<LoginResponse>;
    register(registerDto: RegisterDto, request: Request): Promise<RegisterResponse>;
    adminLogin(loginDto: LoginDto, request: Request, res: Response): Promise<LoginResponse>;
    refresh(body: {
        refresh_token?: string;
    }, request: Request, res: Response): Promise<RefreshResponse>;
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
    logout(request: Request, res: Response): Promise<{
        message: string;
    }>;
    uploadProfileImage(image: Express.Multer.File): Promise<{
        url: string;
    }>;
}
