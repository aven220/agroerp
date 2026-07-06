import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PerfMetricsService } from '../application/perf-metrics.service';

@Injectable()
export class PerfTimingMiddleware implements NestMiddleware {
  constructor(private readonly metrics: PerfMetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    const applyTimingHeaders = () => {
      if (res.headersSent) return;
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
      if (durationMs >= 200) {
        res.setHeader('X-EPOP-Slow-Request', '1');
      }
    };

    const originalEnd = res.end.bind(res);
    res.end = ((...args: unknown[]) => {
      applyTimingHeaders();
      return (originalEnd as (...a: unknown[]) => unknown)(...args);
    }) as Response['end'];

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const orgId = (req as Request & { user?: { organizationId?: string } }).user?.organizationId;
      const moduleKey = req.path.split('/').filter(Boolean)[1] ?? 'api';
      void this.metrics
        .ingest(orgId, {
          metricKey: `http.${req.method}.${req.path}`,
          kind: 'response_time',
          value: durationMs,
          unit: 'ms',
          moduleKey,
          labels: { statusCode: res.statusCode, method: req.method },
        })
        .catch(() => undefined);
    });

    next();
  }
}
