import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { compareSemver } from './plugin-semver.util';

@Injectable()
export class PluginAiService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(organizationId: string) {
    const suggestions: Array<Record<string, unknown>> = [];

    const installed = await this.prisma.eppmPluginInstall.findMany({
      where: { organizationId, status: { in: ['enabled', 'installed'] } },
      select: { pluginKey: true, plugin: { select: { pluginType: true } } },
    });
    const installedKeys = new Set(installed.map((i) => i.pluginKey));

    const published = await this.prisma.eppmPluginPackage.findMany({
      where: { status: 'published', deletedAt: null, visibility: 'public' },
      orderBy: [{ ratingAvg: 'desc' }, { downloadCount: 'desc' }],
      take: 30,
    });

    for (const p of published) {
      if (!installedKeys.has(p.pluginKey) && p.ratingAvg >= 4) {
        suggestions.push({
          type: 'recommend_install',
          pluginKey: p.pluginKey,
          name: p.name,
          rating: p.ratingAvg,
          recommendation: `Instalar extensión popular en categoría ${p.categoryKey}`,
        });
      }
    }

    const installs = await this.prisma.eppmPluginInstall.findMany({
      where: { organizationId, status: 'enabled', autoUpdate: false },
      include: { plugin: true },
    });
    for (const inst of installs) {
      if (compareSemver(inst.plugin.currentVersion, inst.installedVersion) > 0) {
        suggestions.push({
          type: 'suggest_update',
          pluginKey: inst.pluginKey,
          current: inst.installedVersion,
          latest: inst.plugin.currentVersion,
          recommendation: 'Actualización disponible con mejoras de compatibilidad',
        });
      }
    }

    const failed = await this.prisma.eppmPluginInstall.findMany({
      where: { organizationId, status: 'failed' },
      include: { plugin: true },
    });
    for (const f of failed) {
      suggestions.push({
        type: 'incompatibility',
        pluginKey: f.pluginKey,
        recommendation: 'Revisar dependencias y firma antes de reinstalar',
      });
    }

    const usage = await this.prisma.eppmPluginAuditLog.groupBy({
      by: ['pluginKey'],
      where: { organizationId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 3,
    });
    if (usage.length === 0 && installed.length > 5) {
      suggestions.push({
        type: 'usage_analysis',
        recommendation: 'Consolidar plugins inactivos para reducir superficie de ataque',
      });
    }

    return suggestions.slice(0, 15);
  }

  classifyPlugin(manifest: Record<string, unknown>) {
    const pluginType = String(manifest.pluginType ?? 'business_module');
    const tags: string[] = [];
    if (manifest.events) tags.push('event-driven');
    if (manifest.extensionPoints) tags.push('extensible');
    if (manifest.dependencies) tags.push('dependent');
    return { pluginType, autoTags: tags };
  }
}
