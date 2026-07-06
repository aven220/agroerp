import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ApiVersioningService {
  constructor(private readonly prisma: PrismaService) {}

  async listVersions(organizationId: string, apiDefinitionId: string) {
    return this.prisma.apiVersion.findMany({
      where: { organizationId, apiDefinitionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVersion(
    organizationId: string,
    apiDefinitionId: string,
    userId: string,
    data: { version: string; changelog?: string; openApiSpec?: Record<string, unknown> },
  ) {
    return this.prisma.apiVersion.create({
      data: {
        organizationId,
        apiDefinitionId,
        version: data.version,
        changelog: data.changelog,
        openApiSpec: (data.openApiSpec ?? {}) as object,
        createdBy: userId,
      },
    });
  }

  async publishVersion(organizationId: string, apiDefinitionId: string, version: string) {
    const row = await this.prisma.apiVersion.findFirst({
      where: { organizationId, apiDefinitionId, version },
    });
    if (!row) throw new NotFoundException('Versión no encontrada');
    return this.prisma.apiVersion.update({
      where: { id: row.id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async deprecateVersion(organizationId: string, apiDefinitionId: string, version: string) {
    const row = await this.prisma.apiVersion.findFirst({
      where: { organizationId, apiDefinitionId, version },
    });
    if (!row) throw new NotFoundException('Versión no encontrada');
    return this.prisma.apiVersion.update({
      where: { id: row.id },
      data: { status: 'deprecated', deprecatedAt: new Date() },
    });
  }
}
