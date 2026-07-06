import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EVENT_TYPES, EppmPluginManifest } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginDependencyResolver } from './plugin-dependency-resolver.service';
import { PluginManifestValidator } from './plugin-manifest.validator';
import { PluginSignatureService } from './plugin-signature.service';
import { PluginAuditService } from './plugin-audit.service';
import { PluginSandboxService } from './plugin-sandbox.service';

@Injectable()
export class PluginLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly registry: PluginRegistryService,
    private readonly deps: PluginDependencyResolver,
    private readonly validator: PluginManifestValidator,
    private readonly signature: PluginSignatureService,
    private readonly audit: PluginAuditService,
    private readonly sandbox: PluginSandboxService,
  ) {}

  findInstalls(organizationId: string, status?: string) {
    return this.prisma.eppmPluginInstall.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'enabled' } : { status: { not: 'uninstalled' } }),
      },
      include: { plugin: { include: { category: true } } },
      orderBy: { installedAt: 'desc' },
    });
  }

  async install(
    organizationId: string,
    userId: string,
    pluginKey: string,
    config?: Record<string, unknown>,
    version?: string,
  ) {
    const plugin = await this.registry.findOne(pluginKey);
    if (plugin.status !== 'published') {
      throw new BadRequestException('Plugin no publicado en marketplace');
    }

    const manifest = plugin.manifest as unknown as EppmPluginManifest;
    this.validator.validate(manifest);
    const integrity = this.validator.scanIntegrity(manifest);
    if (!integrity.passed) {
      throw new BadRequestException({ message: 'Integridad fallida', issues: integrity.issues });
    }
    if (!this.signature.verify(manifest, plugin.signatureHash ?? undefined)) {
      throw new BadRequestException('Firma digital inválida');
    }
    if (!this.sandbox.validateManifestIsolation(manifest)) {
      throw new BadRequestException('Manifest contiene patrones no permitidos');
    }

    await this.deps.assertCompatible(organizationId, manifest.dependencies ?? []);

    const targetVersion = version ?? plugin.currentVersion;
    const existing = await this.prisma.eppmPluginInstall.findUnique({
      where: { organizationId_pluginKey: { organizationId, pluginKey } },
    });
    if (existing && existing.status !== 'uninstalled') {
      throw new BadRequestException('Plugin ya instalado');
    }

    const install = await this.prisma.eppmPluginInstall.upsert({
      where: { organizationId_pluginKey: { organizationId, pluginKey } },
      update: {
        pluginId: plugin.id,
        installedVersion: targetVersion,
        status: 'enabled',
        config: (config ?? {}) as object,
        enabledAt: new Date(),
        installedBy: userId,
      },
      create: {
        organizationId,
        pluginId: plugin.id,
        pluginKey,
        installedVersion: targetVersion,
        status: 'enabled',
        config: (config ?? {}) as object,
        enabledAt: new Date(),
        installedBy: userId,
      },
    });

    await this.audit.log(organizationId, pluginKey, 'install', userId, { version: targetVersion });
    await this.core.emitUserAction(
      organizationId,
      'Plugin',
      install.id,
      EVENT_TYPES.PLUGIN_INSTALLED,
      { pluginKey, version: targetVersion },
    );
    await this.core.emitUserAction(
      organizationId,
      'Plugin',
      install.id,
      EVENT_TYPES.PLUGIN_ENABLED,
      { pluginKey },
    );
    return install;
  }

  async enable(organizationId: string, userId: string, installId: string) {
    const install = await this.getInstall(organizationId, installId);
    const updated = await this.prisma.eppmPluginInstall.update({
      where: { id: installId },
      data: { status: 'enabled', enabledAt: new Date(), disabledAt: null },
    });
    await this.audit.log(organizationId, install.pluginKey, 'enable', userId);
    await this.core.emitUserAction(
      organizationId,
      'Plugin',
      installId,
      EVENT_TYPES.PLUGIN_ENABLED,
      { pluginKey: install.pluginKey },
    );
    return updated;
  }

  async disable(organizationId: string, userId: string, installId: string) {
    const install = await this.getInstall(organizationId, installId);
    const updated = await this.prisma.eppmPluginInstall.update({
      where: { id: installId },
      data: { status: 'disabled', disabledAt: new Date() },
    });
    await this.audit.log(organizationId, install.pluginKey, 'disable', userId);
    await this.core.emitUserAction(
      organizationId,
      'Plugin',
      installId,
      EVENT_TYPES.PLUGIN_DISABLED,
      { pluginKey: install.pluginKey },
    );
    return updated;
  }

  async uninstall(organizationId: string, userId: string, installId: string) {
    const install = await this.getInstall(organizationId, installId);
    const updated = await this.prisma.eppmPluginInstall.update({
      where: { id: installId },
      data: { status: 'uninstalled' },
    });
    await this.audit.log(organizationId, install.pluginKey, 'uninstall', userId);
    await this.core.emitUserAction(
      organizationId,
      'Plugin',
      installId,
      EVENT_TYPES.PLUGIN_UNINSTALLED,
      { pluginKey: install.pluginKey },
    );
    return updated;
  }

  async cloneConfig(organizationId: string, userId: string, installId: string, targetPluginKey: string) {
    const source = await this.getInstall(organizationId, installId);
    return this.install(organizationId, userId, targetPluginKey, source.config as Record<string, unknown>);
  }

  private async getInstall(organizationId: string, installId: string) {
    const install = await this.prisma.eppmPluginInstall.findFirst({
      where: { id: installId, organizationId },
    });
    if (!install) throw new NotFoundException('Instalación no encontrada');
    return install;
  }
}
