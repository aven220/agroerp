import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PluginExtensionPointsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.eppmExtensionPoint.findMany({
      where: { isActive: true },
      orderBy: { pointKey: 'asc' },
    });
  }

  async register(data: {
    pointKey: string;
    name: string;
    description?: string;
    pluginType: string;
    handlerInterface: string;
  }) {
    return this.prisma.eppmExtensionPoint.upsert({
      where: { pointKey: data.pointKey },
      update: {
        name: data.name,
        description: data.description,
        pluginType: data.pluginType as 'business_module',
        handlerInterface: data.handlerInterface,
        isActive: true,
      },
      create: {
        pointKey: data.pointKey,
        name: data.name,
        description: data.description,
        pluginType: data.pluginType as 'business_module',
        handlerInterface: data.handlerInterface,
      },
    });
  }

  async resolveHandlers(pointKey: string, organizationId: string) {
    const installs = await this.prisma.eppmPluginInstall.findMany({
      where: { organizationId, status: 'enabled' },
      include: { plugin: true },
    });
    return installs
      .filter((i) => {
        const manifest = i.plugin.manifest as { extensionPoints?: Array<{ pointKey: string; handler: string }> };
        return manifest.extensionPoints?.some((ep) => ep.pointKey === pointKey);
      })
      .map((i) => {
        const manifest = i.plugin.manifest as { extensionPoints?: Array<{ pointKey: string; handler: string }> };
        const ep = manifest.extensionPoints?.find((e) => e.pointKey === pointKey);
        return { pluginKey: i.pluginKey, handler: ep?.handler, config: i.config };
      });
  }
}
