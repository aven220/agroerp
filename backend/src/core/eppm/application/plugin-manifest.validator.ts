import { BadRequestException, Injectable } from '@nestjs/common';
import { EppmPluginManifest } from '@agroerp/shared';
import { satisfiesMinVersion } from './plugin-semver.util';

const PLATFORM_VERSION = '1.0.0';

@Injectable()
export class PluginManifestValidator {
  validate(manifest: EppmPluginManifest): void {
    if (!manifest.apiVersion?.startsWith('agroerp.')) {
      throw new BadRequestException('manifest.apiVersion inválido');
    }
    if (!manifest.pluginKey || !/^[\w.]+$/.test(manifest.pluginKey)) {
      throw new BadRequestException('manifest.pluginKey inválido');
    }
    if (!manifest.name || !manifest.version || !manifest.vendor) {
      throw new BadRequestException('manifest incompleto: name, version, vendor requeridos');
    }
    if (!manifest.pluginType) {
      throw new BadRequestException('manifest.pluginType requerido');
    }
    const min = manifest.minPlatformVersion ?? '1.0.0';
    if (!satisfiesMinVersion(PLATFORM_VERSION, min)) {
      throw new BadRequestException(`Plataforma ${PLATFORM_VERSION} incompatible con min ${min}`);
    }
    for (const dep of manifest.dependencies ?? []) {
      if (!dep.pluginKey || !dep.version) {
        throw new BadRequestException('Dependencia inválida en manifest');
      }
    }
    for (const perm of manifest.permissions ?? []) {
      if (!perm.key) throw new BadRequestException('Permiso sin key en manifest');
    }
  }

  scanIntegrity(manifest: EppmPluginManifest, checksum?: string): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!manifest.signature) issues.push('Firma digital ausente');
    if (manifest.extensionPoints?.some((ep) => !ep.pointKey || !ep.handler)) {
      issues.push('Extension point malformado');
    }
    if (checksum && checksum.length < 16) issues.push('Checksum inválido');
    return { passed: issues.length === 0, issues };
  }
}
