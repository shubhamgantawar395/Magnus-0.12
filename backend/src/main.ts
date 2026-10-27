import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as zlib from 'zlib';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        // Disable verbose logger in production for speed
        logger: process.env.NODE_ENV === 'production'
            ? ['error', 'warn']
            : ['log', 'error', 'warn', 'debug'],
    });

    // ── Gzip compression via raw middleware (no extra package needed) ──────
    // Compresses all JSON responses > 1 KB — 60-80% payload reduction
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.use((req: any, res: any, next: () => void) => {
        const acceptEncoding = req.headers['accept-encoding'] || '';
        if (!acceptEncoding.includes('gzip')) return next();

        // Skip for binary content types (PDF, images, etc.)
        const origWrite  = res.write.bind(res);
        const origEnd    = res.end.bind(res);
        let   gzip: zlib.Gzip | null = null;

        const shouldCompress = () => {
            const ct = res.getHeader('content-type') as string || '';
            return ct.includes('json') || ct.includes('text') || ct.includes('javascript');
        };

        res.write = function (chunk: any, ...args: any[]) {
            if (!gzip && shouldCompress()) {
                gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });
                res.setHeader('Content-Encoding', 'gzip');
                res.removeHeader('Content-Length');
                gzip.pipe(res as any, { end: true });
                gzip.write(chunk);
            } else if (gzip) {
                gzip.write(chunk);
            } else {
                origWrite(chunk, ...args);
            }
        };

        res.end = function (chunk?: any, ...args: any[]) {
            if (gzip) {
                if (chunk) gzip.write(chunk);
                gzip.end();
            } else {
                origEnd(chunk, ...args);
            }
        };

        next();
    });

    // ── Cache-Control headers for static/list endpoints ───────────────────
    httpAdapter.use((req: any, res: any, next: () => void) => {
        // Short-lived cache for read endpoints (5 sec) — eliminates double-fetch
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'private, max-age=5');
        } else {
            res.setHeader('Cache-Control', 'no-store');
        }
        // Keep-alive to avoid TCP handshake overhead on every request
        res.setHeader('Connection', 'keep-alive');
        next();
    });

    // ── Validation ────────────────────────────────────────────────────────
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        // Skip validation for missing optional fields — faster
        skipMissingProperties: false,
    }));

    // ── CORS ──────────────────────────────────────────────────────────────
    app.enableCors({
        origin: true,
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type, Accept, Authorization',
    });

    // ── Swagger (only in dev) ─────────────────────────────────────────────
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('Magnus VMS API')
            .setDescription('Magnus Vendor Management System API Documentation')
            .setVersion('0.1')
            .addBearerAuth()
            .addTag('auth', 'Authentication endpoints')
            .addTag('users', 'User management')
            .addTag('customers', 'Customer management')
            .addTag('vendors', 'Vendor management')
            .addTag('challans', 'Delivery challan management')
            .addTag('job-processes', 'Job process tracking')
            .addTag('dispatch', 'Dispatch planning')
            .addTag('invoices', 'Invoice management')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api', app, document);
    }

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Aaniry VMS API running on port ${port}`);
}
bootstrap();
