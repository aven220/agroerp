import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiVisualQueryDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BiQueryEngineService } from './bi-query-engine.service';

@Injectable()
export class BiQueryDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryEngine: BiQueryEngineService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.biQueryDefinition.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const query = await this.prisma.biQueryDefinition.findFirst({
      where: { id, organizationId },
    });
    if (!query) throw new NotFoundException('Consulta no encontrada');
    return query;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      queryKey: string;
      name: string;
      description?: string;
      dataSource: string;
      definition: BiVisualQueryDefinition;
      parameters?: unknown[];
    },
  ) {
    const exists = await this.prisma.biQueryDefinition.findFirst({
      where: { organizationId, queryKey: data.queryKey },
    });
    if (exists) throw new BadRequestException('queryKey ya existe');

    return this.prisma.biQueryDefinition.create({
      data: {
        organizationId,
        queryKey: data.queryKey,
        name: data.name,
        description: data.description,
        dataSource: data.dataSource,
        definition: data.definition as object,
        parameters: (data.parameters ?? []) as object[],
        createdBy: userId,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      name: string;
      description: string;
      definition: BiVisualQueryDefinition;
      parameters: unknown[];
    }>,
  ) {
    await this.findOne(organizationId, id);
    return this.prisma.biQueryDefinition.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.definition ? { definition: data.definition as object } : {}),
        ...(data.parameters ? { parameters: data.parameters as object[] } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.biQueryDefinition.delete({ where: { id } });
  }

  async preview(organizationId: string, definition: BiVisualQueryDefinition) {
    return this.queryEngine.preview(organizationId, definition);
  }

  async execute(organizationId: string, id: string, parameters?: Record<string, unknown>) {
    const saved = await this.findOne(organizationId, id);
    const savedDef = saved.definition as unknown as BiVisualQueryDefinition;
    const definition: BiVisualQueryDefinition = {
      ...savedDef,
      dataSource: saved.dataSource as BiVisualQueryDefinition['dataSource'],
      parameters,
    };
    return this.queryEngine.execute(organizationId, definition);
  }
}
