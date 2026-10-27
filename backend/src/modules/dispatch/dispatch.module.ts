import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [DispatchController],
    providers: [DispatchService],
    exports: [DispatchService]
})
export class DispatchModule { }
