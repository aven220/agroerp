import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { EppmPluginManifest } from '@agroerp/shared';

@Injectable()
export class PluginSignatureService {
  constructor(private readonly config: ConfigService) {}

  computeHash(payload: string | Buffer): string {
    return createHash('sha256').update(payload).digest('hex');
  }

  sign(manifest: EppmPluginManifest): string {
    const secret = this.config.get('EPPM_SIGNING_SECRET', 'agroerp-eppm-dev-secret');
    const body = JSON.stringify({ ...manifest, signature: undefined });
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  verify(manifest: EppmPluginManifest, signature?: string): boolean {
    if (!signature && !manifest.signature) return false;
    const expected = this.sign({ ...manifest, signature: undefined });
    const provided = signature ?? manifest.signature ?? '';
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
    } catch {
      return false;
    }
  }
}
