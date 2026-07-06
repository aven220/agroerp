import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GisLayerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { GisEventEmitter } from './gis-event-emitter.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export interface CreateLayerDto {
  layerCode: string;
  layerName: string;
  layerType?: string;
  sourceModule: string;
  sourceQuery?: Record<string, unknown>;
  geometryType?: string;
  styleRules?: Record<string, unknown>;
  minZoom?: number;
  maxZoom?: number;
  refreshIntervalMin?: number;
  isPublic?: boolean;
}

@Injectable()
export class LayerDefinitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  findAll(organizationId: string, status?: GisLayerStatus) {
    return this.prisma.gisLayerDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(status ? { status } : { status: { in: ['active', 'draft'] } }),
      },
      orderBy: { layerName: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const layer = await this.prisma.gisLayerDefinition.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!layer) throw new NotFoundException('Capa no encontrada');
    return layer;
  }

  async create(organizationId: string, userId: string, dto: CreateLayerDto, ctx?: Partial<RequestContext>) {
    const existing = await this.prisma.gisLayerDefinition.findFirst({
      where: { organizationId, layerCode: dto.layerCode, deletedAt: null },
    });
    if (existing) throw new ConflictException('layerCode ya existe');

    const layer = await this.prisma.gisLayerDefinition.create({
      data: {
        organizationId,
        layerCode: dto.layerCode,
        layerName: dto.layerName,
        layerType: dto.layerType ?? 'vector',
        sourceModule: dto.sourceModule,
        sourceQuery: (dto.sourceQuery ?? {}) as Prisma.InputJsonValue,
        geometryType: dto.geometryType ?? 'Mixed',
        styleRules: (dto.styleRules ?? {}) as Prisma.InputJsonValue,
        minZoom: dto.minZoom ?? 0,
        maxZoom: dto.maxZoom ?? 22,
        refreshIntervalMin: dto.refreshIntervalMin ?? 60,
        status: 'draft',
        isPublic: dto.isPublic ?? true,
        createdBy: userId,
      },
    });
    return layer;
  }

  async update(organizationId: string, id: string, dto: Partial<CreateLayerDto>, ctx?: Partial<RequestContext>) {
    await this.findById(organizationId, id);
    const layer = await this.prisma.gisLayerDefinition.update({
      where: { id },
      data: {
        ...(dto.layerName ? { layerName: dto.layerName } : {}),
        ...(dto.layerType ? { layerType: dto.layerType } : {}),
        ...(dto.sourceModule ? { sourceModule: dto.sourceModule } : {}),
        ...(dto.sourceQuery ? { sourceQuery: dto.sourceQuery as Prisma.InputJsonValue } : {}),
        ...(dto.geometryType ? { geometryType: dto.geometryType } : {}),
        ...(dto.styleRules ? { styleRules: dto.styleRules as Prisma.InputJsonValue } : {}),
        ...(dto.minZoom != null ? { minZoom: dto.minZoom } : {}),
        ...(dto.maxZoom != null ? { maxZoom: dto.maxZoom } : {}),
        ...(dto.refreshIntervalMin != null ? { refreshIntervalMin: dto.refreshIntervalMin } : {}),
        ...(dto.isPublic != null ? { isPublic: dto.isPublic } : {}),
      },
    });
    return layer;
  }

  async publish(organizationId: string, id: string, ctx?: Partial<RequestContext>) {
    const layer = await this.prisma.gisLayerDefinition.update({
      where: { id },
      data: { status: 'active' },
    });
    await this.gisEvents.layerPublished(organizationId, id, { layerCode: layer.layerCode }, ctx);
    return layer;
  }

  async archive(organizationId: string, id: string) {
    await this.findById(organizationId, id);
    return this.prisma.gisLayerDefinition.update({
      where: { id },
      data: { status: 'archived', deletedAt: new Date() },
    });
  }

  async ensureDefaultLayers(organizationId: string, userId?: string) {
    const defaults: CreateLayerDto[] = [
      {
        layerCode: 'producers',
        layerName: 'Productores',
        sourceModule: 'PRM',
        geometryType: 'Point',
        styleRules: { color: '#2563eb', icon: 'producer' },
      },
      {
        layerCode: 'farms',
        layerName: 'Fincas',
        sourceModule: 'FTIP',
        geometryType: 'Polygon',
        styleRules: { fill: '#16a34a33', stroke: '#16a34a' },
      },
      {
        layerCode: 'lots',
        layerName: 'Lotes',
        sourceModule: 'FMDT',
        geometryType: 'Polygon',
        styleRules: { fill: '#ca8a0433', stroke: '#ca8a04' },
      },
      {
        layerCode: 'form_submissions',
        layerName: 'Envíos de formularios',
        sourceModule: 'UDFE',
        geometryType: 'Point',
        styleRules: { color: '#7c3aed' },
      },
      {
        layerCode: 'geofences',
        layerName: 'Geocercas',
        sourceModule: 'EGSIP',
        geometryType: 'Polygon',
        styleRules: { fill: '#dc262633', stroke: '#dc2626' },
      },
    ];

    for (const def of defaults) {
      const exists = await this.prisma.gisLayerDefinition.findFirst({
        where: { organizationId, layerCode: def.layerCode },
      });
      if (!exists) {
        const created = await this.create(organizationId, userId ?? organizationId, def);
        await this.publish(organizationId, created.id);
      }
    }
  }
}
