import { Injectable } from '@nestjs/common';
import { EsdjeRetryStrategy } from '@agroerp/shared';

@Injectable()
export class JobRetryEngine {
  computeDelay(
    strategy: EsdjeRetryStrategy | string,
    baseDelayMs: number,
    attempt: number,
  ): number {
    switch (strategy) {
      case 'linear':
        return baseDelayMs * attempt;
      case 'fixed':
        return baseDelayMs;
      case 'exponential':
      default:
        return baseDelayMs * Math.pow(2, attempt - 1);
    }
  }

  shouldRetry(attempt: number, maxRetries: number): boolean {
    return attempt < maxRetries;
  }
}
