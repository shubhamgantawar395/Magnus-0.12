import { Module } from '@nestjs/common';
import { TrayService } from './tray.service';
import { TrayController } from './tray.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TrayController],
    providers: [TrayService],
    exports: [TrayService]
})
export class TrayModule { }
