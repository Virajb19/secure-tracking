import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';
import { AgentLocationService } from './agent-location.service';
import { PrismaModule } from '../prisma';

/**
 * Tracking Module.
 * Provides real-time WebSocket-based agent tracking.
 * 
 * Components:
 * - TrackingGateway: WebSocket gateway for location updates
 * - AgentLocationService: Location storage and validation
 */
@Module({
    imports: [
        PrismaModule,
        // Import JwtModule to verify tokens in WebSocket connections
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
                },
            }),
        }),
    ],
    providers: [
        TrackingGateway,
        AgentLocationService,
    ],
    exports: [AgentLocationService],
})
export class TrackingModule { }
