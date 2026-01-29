import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Development Delay Middleware
 * 
 * Adds an artificial delay of 7 seconds for POST and DELETE requests
 * ONLY in development mode (NODE_ENV !== 'production')
 * 
 * This helps test loading states and UI behavior during async operations.
 */
@Injectable()
export class DevDelayMiddleware implements NestMiddleware {
    constructor(private configService: ConfigService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
        
        // Only apply delay in development mode for POST/DELETE requests
        if (nodeEnv !== 'production' && (req.method === 'POST' || req.method === 'DELETE')) {
            const delayMs = 3000; // 3 seconds
            console.log(`[DevDelay] Adding ${delayMs}ms delay for ${req.method} ${req.url}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        next();
    }
}
