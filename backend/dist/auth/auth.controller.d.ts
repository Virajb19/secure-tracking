import { Request } from 'express';
import { AuthService, LoginResponse, RegisterResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, request: Request): Promise<LoginResponse>;
    register(registerDto: RegisterDto, request: Request): Promise<RegisterResponse>;
    adminLogin(loginDto: LoginDto, request: Request): Promise<LoginResponse>;
    private extractIpAddress;
    logout(request: Request): Promise<{
        message: string;
    }>;
    uploadProfileImage(image: Express.Multer.File): Promise<{
        url: string;
    }>;
}
