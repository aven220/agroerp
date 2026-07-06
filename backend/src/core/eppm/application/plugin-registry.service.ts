import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EppmPluginDefinition, EppmPluginManifest, EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PluginManifestValidator } from './plugin-manifest.validator';
import { PluginSignatureService } from './plugin-signature.service';

@Injectable()
export class PluginRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: PluginManifestValidator,
    private readonly signature: PluginSignatureService,
    private readonly core: CoreEngineService,
  ) {}

  findPublished(filters?: { categoryKey?: string; pluginType?: string; search?: string }) {
    return this.prisma.eppmPluginPackage.findMany({
      where: {
        deletedAt: null,
        status: 'published',
        visibility: { in: ['public', 'org_only'] },
        ...(filters?.categoryKey ? { categoryKey: filters.categoryKey } : {}),
        ...(filters?.pluginType ? { pluginType: filters.pluginType as 'business_module' } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { pluginKey: { contains: filters.search, mode: 'insensitive' } },
                { tags: { has: filters.search } },
              ],
            }
          : {}),
      },
      include: { category: true, _count: { select: { versions: true, reviews: true } } },
      orderBy: [{ downloadCount: 'desc' }, { ratingAvg: 'desc' }],
      take: 200,
    });
  }

  async findOne(pluginKey: string) {
    const plugin = await this.prisma.eppmPluginPackage.findFirst({
      where: { pluginKey, deletedAt: null },
      include: {
        versions: { orderBy: { publishedAt: 'desc' }, take: 20 },
        permissions: true,
        category: true,
        reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!plugin) throw new NotFoundException('Plugin no encontrado');
    return plugin;
  }

  async create(userId: string, dto: EppmPluginDefinition, organizationId?: string) {
    const manifest = dto.manifest;
    if (manifest) this.validator.validate(manifest);

    const existing = await this.prisma.eppmPluginPackage.findUnique({
      where: { pluginKey: dto.pluginKey },
    });
    if (existing) throw new BadRequestException(`Plugin ${dto.pluginKey} ya existe`);

    const sigHash = manifest?.signature
      ? this.signature.computeHash(JSON.stringify(manifest))
      : manifest
        ? this.signature.sign(manifest)
        : undefined;

    const plugin = await this.prisma.eppmPluginPackage.create({
      data: {
        pluginKey: dto.pluginKey,
        name: dto.name,
        description: dto.description,
        vendor: dto.vendor,
        vendorType: (dto.vendorType ?? 'official') as 'official',
        pluginType: dto.pluginType as 'business_module',
        categoryKey: dto.categoryKey,
        visibility: (dto.visibility ?? 'public') as 'public',
        manifest: (manifest ?? {}) as object,
        screenshots: dto.screenshots ?? [],
        documentation: dto.documentation,
        license: dto.license,
        compatibility: (dto.compatibility ?? {}) as object,
        tags: dto.tags ?? [],
        metadata: (dto.metadata ?? {}) as object,
        signatureHash: sigHash,
        signatureVerified: manifest ? this.signature.verify(manifest) : false,
        organizationId,
        createdBy: userId,
        currentVersion: manifest?.version ?? '1.0.0',
      },
    });

    if (manifest) {
      await this.createVersion(plugin.id, manifest);
      await this.syncPermissions(plugin.id, manifest);
    }
    return plugin;
  }

  async publish(pluginKey: string, userId: string, organizationId?: string) {
    const plugin = await this.findOne(pluginKey);
    if (!plugin.signatureVerified && plugin.signatureHash) {
      const manifest = plugin.manifest as unknown as EppmPluginManifest;
      if (!this.signature.verify(manifest)) {
        throw new BadRequestException('Firma digital inválida — no se puede publicar');
      }
    }
    const updated = await this.prisma.eppmPluginPackage.update({
      where: { id: plugin.id },
      data: { status: 'published', publishedAt: new Date(), signatureVerified: true },
    });
    if (organizationId) {
      await this.core.emitUserAction(
        organizationId,
        'Plugin',
        plugin.id,
        EVENT_TYPES.PLUGIN_PUBLISHED,
        { pluginKey, version: plugin.currentVersion },
      );
    }
    return updated;
  }

  async createVersion(pluginId: string, manifest: EppmPluginManifest) {
    return this.prisma.eppmPluginVersion.upsert({
      where: { pluginId_version: { pluginId, version: manifest.version } },
      update: {
        manifest: manifest as object,
        changelog: manifest.description,
        dependencies: (manifest.dependencies ?? []) as object,
        signatureHash: manifest.signature ?? this.signature.sign(manifest),
      },
      create: {
        pluginId,
        version: manifest.version,
        manifest: manifest as object,
        changelog: manifest.description,
        minPlatformVersion: manifest.minPlatformVersion ?? '1.0.0',
        dependencies: (manifest.dependencies ?? []) as object,
        signatureHash: manifest.signature ?? this.signature.sign(manifest),
      },
    });
  }

  listVersions(pluginKey: string) {
    return this.prisma.eppmPluginVersion.findMany({
      where: { plugin: { pluginKey } },
      orderBy: { publishedAt: 'desc' },
    });
  }

  listCategories() {
    return this.prisma.eppmPluginCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  private async syncPermissions(pluginId: string, manifest: EppmPluginManifest) {
    for (const perm of manifest.permissions ?? []) {
      await this.prisma.eppmPluginPermission.upsert({
        where: { pluginId_permissionKey: { pluginId, permissionKey: perm.key } },
        update: { description: perm.description, scope: perm.scope ?? 'org' },
        create: {
          pluginId,
          permissionKey: perm.key,
          description: perm.description,
          scope: perm.scope ?? 'org',
        },
      });
    }
  }
}
