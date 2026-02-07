"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const nestjs_zod_1 = require("nestjs-zod");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const env_validation_1 = require("./env.validation");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new nestjs_zod_1.ZodValidationPipe());
    app.use((0, cookie_parser_1.default)());
    const frontendOrigin = env_validation_1.env.CORS_ORIGIN || 'http://localhost:3000';
    console.log(`Enabling CORS for origin: ${frontendOrigin}`);
    app.enableCors({
        origin: configService.get('CORS_ORIGIN') || frontendOrigin,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', true);
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });
    const port = configService.get('PORT', 3001);
    await app.listen(port, '0.0.0.0');
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   SECURE QUESTION PAPER DELIVERY TRACKING SYSTEM              ║
║   Government-Grade Backend Service                            ║
╠═══════════════════════════════════════════════════════════════╣
║   Server running on: http://localhost:${port}                    ║
║   Environment: ${configService.get('NODE_ENV', 'development').padEnd(44)}║
╚═══════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
//# sourceMappingURL=main.js.map