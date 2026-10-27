import { Module } from '@nestjs/common';
import { ChallansService } from './challans.service';
import { ChallansController } from './challans.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, CommonModule, NotificationsModule],
    controllers: [ChallansController],
    providers: [ChallansService],
    exports: [ChallansService]
})
export class ChallansModule { }
