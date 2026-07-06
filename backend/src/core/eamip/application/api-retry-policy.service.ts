import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiRetryPolicyService {
  async execute<T>(
    fn: () => Promise<T>,
    retryCount: number,
    timeoutMs: number,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await this.withTimeout(fn(), timeoutMs);
      } catch (err) {
        lastError = err;
        if (attempt >= retryCount) break;
        await this.delay(Math.min(1000 * 2 ** attempt, 5000));
      }
    }
    throw lastError;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Request timeout')), ms);
      promise
        .then((v) => { clearTimeout(timer); resolve(v); })
        .catch((e) => { clearTimeout(timer); reject(e); });
    });
  }

  private delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
