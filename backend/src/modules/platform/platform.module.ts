import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule, forwardRef(() => AuthModule)],
    controllers: [PlatformController],
    providers: [PlatformService],
    exports: [PlatformService],
})
export class PlatformModule { }
