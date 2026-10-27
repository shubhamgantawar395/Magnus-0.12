import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // This middleware expects that Passport authentication has already run
        // OR it extracts from headers if this is a pre-auth check (e.g. for login context)
        // For now, we rely on the authenticated user.

        // Note: In NestJS, middleware runs before Guards. 
        // So req.user might not be populated yet if using AuthGuard in controller.
        // However, if we mount this globally or after auth middleware it works.

        // For this specific task, we'll ensure organizationId is accessible 
        // in a standardized way on the request object.

        const user = (req as any).user;
        if (user && user.organizationId) {
            (req as any).organizationId = user.organizationId;
        }

        next();
    }
}
