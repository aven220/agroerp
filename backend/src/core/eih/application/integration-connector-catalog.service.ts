import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IntegrationConnectorCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.eihConnectorCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  findByKey(catalogKey: string) {
    return this.prisma.eihConnectorCatalog.findUnique({ where: { catalogKey } });
  }

  register(data: {
    catalogKey: string;
    name: string;
    description?: string;
    protocol: string;
    category: string;
    handlerRef: string;
    configSchema?: Record<string, unknown>;
  }) {
    return this.prisma.eihConnectorCatalog.upsert({
      where: { catalogKey: data.catalogKey },
      update: {
        name: data.name,
        description: data.description,
        protocol: data.protocol as 'rest',
        category: data.category as 'custom',
        handlerRef: data.handlerRef,
        configSchema: (data.configSchema ?? {}) as object,
        isActive: true,
      },
      create: {
        catalogKey: data.catalogKey,
        name: data.name,
        description: data.description,
        protocol: data.protocol as 'rest',
        category: data.category as 'custom',
        handlerRef: data.handlerRef,
        configSchema: (data.configSchema ?? {}) as object,
      },
    });
  }
}
