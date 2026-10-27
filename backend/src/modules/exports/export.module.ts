import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ReportsModule } from '../reports/reports.module';

@Module({
    imports: [ReportsModule],
    controllers: [ExportController],
    providers: [ExportService],
    exports: [ExportService]
})
export class ExportModule { }
