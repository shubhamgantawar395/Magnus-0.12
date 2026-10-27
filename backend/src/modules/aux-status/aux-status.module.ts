import { Module } from '@nestjs/common';
import { AuxStatusController } from './aux-status.controller';
import { AuxStatusService } from './aux-status.service';

@Module({
    controllers: [AuxStatusController],
    providers: [AuxStatusService],
    exports: [AuxStatusService],
})
export class AuxStatusModule {}
