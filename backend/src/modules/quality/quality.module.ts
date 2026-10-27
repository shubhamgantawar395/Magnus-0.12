import { Module } from '@nestjs/common';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';
import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [QualityController],
    providers: [QualityService],
    exports: [QualityService],
})
export class QualityModule { }
