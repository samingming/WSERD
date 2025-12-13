// src/middlewares/metrics.ts
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Keep registry isolated to avoid accidental global pollution during tests.
const register = new client.Registry();

// Collect default Node.js metrics (event loop, memory, etc.).
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total count of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpErrorCounter = new client.Counter({
  name: 'http_errors_total',
  help: 'Total count of HTTP responses with status >= 500',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000],
  registers: [register],
});

function resolveRouteLabel(req: Request): string {
  // Prefer declared route pattern; fall back to original URL without query to reduce cardinality.
  const routePath = (req as any).route?.path;
  const base = req.baseUrl ?? '';
  if (routePath) return `${base}${routePath}`;
  const url = req.originalUrl.split('?')[0];
  return url || 'unknown';
}

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const end = httpRequestDuration.startTimer();
  const method = req.method;

  res.on('finish', () => {
    const route = resolveRouteLabel(req);
    const status = res.statusCode.toString();

    httpRequestCounter.labels(method, route, status).inc();
    if (res.statusCode >= 500) {
      httpErrorCounter.labels(method, route, status).inc();
    }
    end({ method, route, status_code: status });
  });

  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export { register as metricsRegistry };
