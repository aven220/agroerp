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
import { PluginAuditService } from './plugin-audit.service';
import { compareSemver } from './plugin-semver.util';

@Injectable()
export class PluginUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly registry: PluginRegistryService,
    private readonly deps: PluginDependencyResolver,
    private readonly audit: PluginAuditService,
  ) {}

  listJobs(organizationId: string) {
    return this.prisma.eppmPluginUpdateJob.findMany({
      where: { organizationId },
      include: { install: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async scheduleUpdate(
    organizationId: string,
    userId: string,
    installId: string,
    toVersion: string,
    scheduledAt?: Date,
  ) {
    const install = await this.prisma.eppmPluginInstall.findFirst({
      where: { id: installId, organizationId },
      include: { plugin: true },
    });
    if (!install) throw new NotFoundException('Instalación no encontrada');

    const version = await this.prisma.eppmPluginVersion.findUnique({
      where: { pluginId_version: { pluginId: install.pluginId, version: toVersion } },
    });
    if (!version) throw new BadRequestException('Versión no encontrada');

    return this.prisma.eppmPluginUpdateJob.create({
      data: {
        organizationId,
        installId,
        fromVersion: install.installedVersion,
        toVersion,
        status: 'pending',
        scheduledAt: scheduledAt ?? new Date(),
      },
    });
  }

  async executeUpdate(organizationId: string, userId: string, jobId: string) {
    const job = await this.prisma.eppmPluginUpdateJob.findFirst({
      where: { id: jobId, organizationId },
      include: { install: { include: { plugin: true } } },
    });
    if (!job) throw new NotFoundException('Job de actualización no encontrado');

    await this.prisma.eppmPluginUpdateJob.update({
      where: { id: jobId },
      data: { status: 'running' },
    });
    await this.prisma.eppmPluginInstall.update({
      where: { id: job.installId },
      data: { status: 'updating' },
    });

    try {
      const version = await this.prisma.eppmPluginVersion.findUnique({
        where: {
          pluginId_version: { pluginId: job.install.pluginId, version: job.toVersion },
        },
      });
      const manifest = (version?.manifest ?? job.install.plugin.manifest) as unknown as EppmPluginManifest;
      await this.deps.assertCompatible(organizationId, manifest.dependencies ?? []);

      await this.prisma.eppmPluginInstall.update({
        where: { id: job.installId },
        data: {
          previousVersion: job.fromVersion,
          installedVersion: job.toVersion,
          status: 'enabled',
        },
      });
      await this.prisma.eppmPluginUpdateJob.update({
        where: { id: jobId },
        data: { status: 'completed', completedAt: new Date(), rollbackVersion: job.fromVersion },
      });
      await this.audit.log(organizationId, job.install.pluginKey, 'update', userId, {
        from: job.fromVersion,
        to: job.toVersion,
      });
      await this.core.emitUserAction(
        organizationId,
        'Plugin',
        job.installId,
        EVENT_TYPES.PLUGIN_UPDATED,
        { pluginKey: job.install.pluginKey, from: job.fromVersion, to: job.toVersion },
      );
      return { updated: true };
    } catch (err) {
      await this.prisma.eppmPluginUpdateJob.update({
        where: { id: jobId },
        data: { status: 'failed', error: (err as Error).message, completedAt: new Date() },
      });
      await this.prisma.eppmPluginInstall.update({
        where: { id: job.installId },
        data: { status: 'failed' },
      });
      await this.core.emitUserAction(
        organizationId,
        'Plugin',
        job.installId,
        EVENT_TYPES.PLUGIN_UPDATE_FAILED,
        { pluginKey: job.install.pluginKey, error: (err as Error).message },
      );
      throw err;
    }
  }

  async rollback(organizationId: string, userId: string, installId: string) {
    const install = await this.prisma.eppmPluginInstall.findFirst({
      where: { id: installId, organizationId },
    });
    if (!install?.previousVersion) {
      throw new BadRequestException('No hay versión anterior para rollback');
    }
    const updated = await this.prisma.eppmPluginInstall.update({
      where: { id: installId },
      data: {
        installedVersion: install.previousVersion,
        status: 'enabled',
        previousVersion: install.installedVersion,
      },
    });
    await this.audit.log(organizationId, install.pluginKey, 'rollback', userId, {
      to: install.previousVersion,
    });
    await this.core.emitUserAction(
      organizationId,
      'Plugin',
      installId,
      EVENT_TYPES.PLUGIN_ROLLBACK,
      { pluginKey: install.pluginKey, version: install.previousVersion },
    );
    return updated;
  }

  compareVersions(pluginKey: string, fromVersion: string, toVersion: string) {
    return {
      pluginKey,
      fromVersion,
      toVersion,
      direction: compareSemver(toVersion, fromVersion) > 0 ? 'upgrade' : 'downgrade',
      delta: compareSemver(toVersion, fromVersion),
    };
  }

  async processAutoUpdates() {
    const installs = await this.prisma.eppmPluginInstall.findMany({
      where: { autoUpdate: true, status: 'enabled' },
      include: { plugin: true },
      take: 50,
    });
    for (const inst of installs) {
      if (compareSemver(inst.plugin.currentVersion, inst.installedVersion) > 0) {
        const job = await this.scheduleUpdate(
          inst.organizationId,
          'system',
          inst.id,
          inst.plugin.currentVersion,
        );
        await this.executeUpdate(inst.organizationId, 'system', job.id);
      }
    }
  }
}
