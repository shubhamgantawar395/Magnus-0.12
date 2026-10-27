import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHealth(): any {
        return {
            status: 'ok',
            message: 'Aaniry VMS API is running correctly',
            service: 'Vendor Management System',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        };
    }
}
