import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { EppmPluginManifest } from '@agroerp/shared';
import { PluginManifestValidator } from './plugin-manifest.validator';
import { PluginSignatureService } from './plugin-signature.service';

@Injectable()
export class PluginSdkService {
  constructor(
    private readonly validator: PluginManifestValidator,
    private readonly signature: PluginSignatureService,
  ) {}

  validateManifest(manifest: EppmPluginManifest) {
    this.validator.validate(manifest);
    const integrity = this.validator.scanIntegrity(manifest);
    return { valid: true, integrity };
  }

  packageManifest(manifest: EppmPluginManifest) {
    this.validator.validate(manifest);
    const signed = { ...manifest, signature: this.signature.sign(manifest) };
    const checksum = createHash('sha256').update(JSON.stringify(signed)).digest('hex');
    return { manifest: signed, checksum, packageFormat: 'agroerp-plugin-v1' };
  }

  getTemplate(pluginType: string) {
    return {
      apiVersion: 'agroerp.platform/v1',
      pluginKey: `vendor.${pluginType}.example`,
      name: 'Example Plugin',
      version: '1.0.0',
      vendor: 'Your Organization',
      pluginType,
      minPlatformVersion: '1.0.0',
      dependencies: [],
      permissions: [{ key: 'plugin:example:read', description: 'Read example data', scope: 'org' }],
      extensionPoints: [{ pointKey: 'core.dashboard.widgets', handler: 'example.widget' }],
      events: { subscribe: ['ProducerCreated'], publish: [] },
      configSchema: { type: 'object', properties: {} },
    };
  }
}
