import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceSchemaDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { FieldValidatorService } from './field-validator.service';
import { CreateSchemaDto, UpdateSchemaDto } from '../presentation/schemas.dto';

@Injectable()
export class MetadataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: FieldValidatorService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.resourceSchema.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: [{ resourceType: 'asc' }, { version: 'desc' }],
    });
  }

  async findActiveSchema(
    organizationId: string,
    resourceType: string,
  ): Promise<ResourceSchemaDefinition | null> {
    const schema = await this.prisma.resourceSchema.findFirst({
      where: {
        resourceType,
        active: true,
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: [{ organizationId: 'desc' }, { version: 'desc' }],
    });

    if (!schema) return null;
    return schema.definition as unknown as ResourceSchemaDefinition;
  }

  async findOne(organizationId: string, id: string) {
    const schema = await this.prisma.resourceSchema.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (!schema) throw new NotFoundException('Schema not found');
    return schema;
  }

  async create(organizationId: string, dto: CreateSchemaDto) {
    const latest = await this.prisma.resourceSchema.findFirst({
      where: { organizationId, resourceType: dto.resourceType },
      orderBy: { version: 'desc' },
    });

    const version = (latest?.version ?? 0) + 1;

    if (dto.activate !== false) {
      await this.prisma.resourceSchema.updateMany({
        where: { organizationId, resourceType: dto.resourceType, active: true },
        data: { active: false },
      });
    }

    const definition: ResourceSchemaDefinition = {
      resourceType: dto.resourceType,
      version,
      label: dto.label,
      fields: dto.fields,
      states: dto.states,
    };

    return this.prisma.resourceSchema.create({
      data: {
        organizationId,
        resourceType: dto.resourceType,
        version,
        label: dto.label,
        definition: definition as object,
        active: dto.activate !== false,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateSchemaDto) {
    const existing = await this.findOne(organizationId, id);
    if (existing.organizationId && existing.organizationId !== organizationId) {
      throw new ConflictException('Cannot modify global schema');
    }

    const currentDef = existing.definition as unknown as ResourceSchemaDefinition;
    const definition: ResourceSchemaDefinition = {
      ...currentDef,
      label: dto.label ?? currentDef.label,
      fields: dto.fields ?? currentDef.fields,
      states: dto.states ?? currentDef.states,
    };

    return this.prisma.resourceSchema.update({
      where: { id },
      data: {
        label: dto.label,
        definition: definition as object,
        active: dto.active,
      },
    });
  }

  validateResourceData(
    schema: ResourceSchemaDefinition | null,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!schema || schema.fields.length === 0) {
      return data;
    }
    return this.validator.validate(schema, data);
  }
}
