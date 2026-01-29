"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const prisma_1 = require("./prisma");
const appwrite_1 = require("./appwrite");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const audit_logs_module_1 = require("./audit-logs/audit-logs.module");
const tasks_module_1 = require("./tasks/tasks.module");
const task_events_module_1 = require("./task-events/task-events.module");
const master_data_module_1 = require("./master-data/master-data.module");
const faculty_module_1 = require("./faculty/faculty.module");
const form_6_module_1 = require("./form-6/form-6.module");
const events_module_1 = require("./events/events.module");
const notices_module_1 = require("./notices/notices.module");
const circulars_module_1 = require("./circulars/circulars.module");
const helpdesk_module_1 = require("./helpdesk/helpdesk.module");
const notifications_module_1 = require("./notifications/notifications.module");
const paper_setter_module_1 = require("./paper-setter/paper-setter.module");
const bank_details_module_1 = require("./bank-details/bank-details.module");
const user_stars_module_1 = require("./user-stars/user-stars.module");
const analytics_module_1 = require("./analytics/analytics.module");
const form_submissions_module_1 = require("./form-submissions/form-submissions.module");
const middlewares_1 = require("./shared/middlewares");
let AppModule = class AppModule {
    constructor(configService) {
        this.configService = configService;
    }
    configure(consumer) {
        const nodeEnv = this.configService.get('NODE_ENV', 'development');
        if (nodeEnv !== 'production') {
            consumer
                .apply(middlewares_1.DevDelayMiddleware)
                .forRoutes('*');
        }
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([{
                    name: 'default',
                    ttl: 60000,
                    limit: 100,
                }]),
            prisma_1.PrismaModule,
            appwrite_1.AppwriteModule,
            audit_logs_module_1.AuditLogsModule,
            notifications_module_1.NotificationsModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            tasks_module_1.TasksModule,
            task_events_module_1.TaskEventsModule,
            master_data_module_1.MasterDataModule,
            faculty_module_1.FacultyModule,
            form_6_module_1.Form6Module,
            events_module_1.EventsModule,
            notices_module_1.NoticesModule,
            circulars_module_1.CircularsModule,
            helpdesk_module_1.HelpdeskModule,
            paper_setter_module_1.PaperSetterModule,
            bank_details_module_1.BankDetailsModule,
            user_stars_module_1.UserStarsModule,
            analytics_module_1.AnalyticsModule,
            form_submissions_module_1.FormSubmissionsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    }),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppModule);
//# sourceMappingURL=app.module.js.map