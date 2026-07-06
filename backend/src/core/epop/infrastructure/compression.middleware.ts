import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { gzipSync } from 'zlib';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const accept = req.headers['accept-encoding'] ?? '';
    if (!String(accept).includes('gzip')) {
      next();
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      try {
        if (res.headersSent) {
          return originalJson(body);
        }
        const payload = Buffer.from(JSON.stringify(body));
        if (payload.length < 1024) {
          return originalJson(body);
        }
        const compressed = gzipSync(payload);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-EPOP-Compression', 'gzip');
        res.setHeader('X-EPOP-Original-Size', String(payload.length));
        res.setHeader('X-EPOP-Compressed-Size', String(compressed.length));
        res.end(compressed);
        return res;
      } catch {
        return originalJson(body);
      }
    }) as Response['json'];

    next();
  }
}
