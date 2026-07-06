import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { API_CONNECTOR_TYPES } from '@agroerp/shared';

@Injectable()
export class ApiConnectorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.apiConnector.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      connectorKey: string;
      connectorType: string;
      name: string;
      description?: string;
      baseUrl?: string;
      authType?: string;
      credentialRef?: string;
      healthUrl?: string;
      settings?: Record<string, unknown>;
    },
  ) {
    if (!API_CONNECTOR_TYPES.includes(data.connectorType as never)) {
      throw new BadRequestException('Tipo de conector inválido');
    }
    return this.prisma.apiConnector.create({
      data: {
        organizationId,
        connectorKey: data.connectorKey,
        connectorType: data.connectorType as never,
        name: data.name,
        description: data.description,
        baseUrl: data.baseUrl,
        authType: (data.authType ?? 'api_key') as never,
        credentialRef: data.credentialRef,
        healthUrl: data.healthUrl,
        settings: (data.settings ?? {}) as object,
        createdBy: userId,
      },
    });
  }
}
