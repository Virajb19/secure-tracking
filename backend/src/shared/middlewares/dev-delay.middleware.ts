import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { env } from 'process';

/**
 * Development Delay Middleware
 * 
 * Adds an artificial delay of 3 seconds for POST, DELETE, PUT, and PATCH requests
 * ONLY in development mode (NODE_ENV !== 'production')
 * 
 * This helps test loading states and UI behavior during async operations.
 */
@Injectable()
export class DevDelayMiddleware implements NestMiddleware {
    constructor(private configService: ConfigService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const nodeEnv = env.NODE_ENV || this.configService.get<string>('NODE_ENV', 'development');
        

         if (nodeEnv === 'production') {
                return next();
            }

            let delayMs = 0;

            if (req.method === 'GET') {
                delayMs = 2000; // 2s for queries
            } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
                delayMs = 3000; // 3s for mutations
            }

              if (delayMs > 0) {
                console.log( `[DevDelay] ${delayMs}ms delay for ${req.method} ${req.url}`, );    
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

        
        next();
    }
}
