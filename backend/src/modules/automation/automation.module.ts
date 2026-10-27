import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationService } from './automation.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        PrismaModule,
        NotificationsModule,
        CommonModule
    ],
    providers: [AutomationService],
    exports: [AutomationService]
})
export class AutomationModule { }
