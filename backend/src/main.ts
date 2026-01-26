import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

/**
 * Application Bootstrap.
 * 
 * Configures:
 * - Global validation pipe for DTO validation
 * - CORS for cross-origin requests
 * - Trust proxy for correct IP extraction behind load balancers
 */
async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    app.setGlobalPrefix('api');

    // Enable global Zod validation pipe
    // This automatically validates all DTOs using nestjs-zod
    app.useGlobalPipes(new ZodValidationPipe());

    // Enable CORS for mobile app and CMS
    app.enableCors({
        origin: configService.get<string>('CORS_ORIGIN', '*'),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // Trust proxy for correct IP detection behind reverse proxies
    // This is required for accurate IP logging in audit_logs
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', true);

    // Serve static files from uploads directory
    // Images are accessible at /uploads/{taskId}/{filename}
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });

    const port = configService.get<number>('PORT', 3001);
    await app.listen(3001);

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   SECURE QUESTION PAPER DELIVERY TRACKING SYSTEM              ║
║   Government-Grade Backend Service                            ║
╠═══════════════════════════════════════════════════════════════╣
║   Server running on: http://localhost:${port}                    ║
║   Environment: ${configService.get<string>('NODE_ENV', 'development').padEnd(44)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
