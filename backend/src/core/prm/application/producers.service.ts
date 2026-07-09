import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProducerLifecycleStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import {
  CreateProducerDto,
  UpdateProducerDto,
} from '../presentation/producers.dto';

export interface ProducerListFilters {
  lifecycleStatus?: ProducerLifecycleStatus;
  municipalityCode?: string;
  veredaCode?: string;
  assignedBuyerId?: string;
  assignedTechnicianId?: string;
  segmentId?: string;
  categoryCode?: string;
  certificationScheme?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  private readonly includeRelations = {
    contacts: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' as const } },
    addresses: { where: { deletedAt: null }, orderBy: { isPrimary: 'desc' as const } },
    certifications: { where: { deletedAt: null } },
    documents: { where: { deletedAt: null } },
    producerNotes: { orderBy: { createdAt: 'desc' as const }, take: 20 },
    farmLinks: { where: { unlinkedAt: null } },
    territoryLinks: {
      where: { unlinkedAt: null },
      include: {
        farmUnit: {
          select: {
            id: true,
            farmCode: true,
            farmName: true,
            status: true,
            totalAreaHa: true,
            municipalityCode: true,
          },
        },
      },
    },
    segmentMemberships: { include: { segment: true } },
    lifecycleEvents: { orderBy: { occurredAt: 'desc' as const }, take: 10 },
  };

  async findAll(organizationId: string, filters: ProducerListFilters = {}) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProducerWhereInput = {
      organizationId,
      deletedAt: null,
      ...(filters.lifecycleStatus
        ? { lifecycleStatus: filters.lifecycleStatus }
        : {}),
      ...(filters.municipalityCode
        ? { municipalityCode: filters.municipalityCode }
        : {}),
      ...(filters.veredaCode ? { veredaCode: filters.veredaCode } : {}),
      ...(filters.assignedBuyerId
        ? { assignedBuyerId: filters.assignedBuyerId }
        : {}),
      ...(filters.assignedTechnicianId
        ? { assignedTechnicianId: filters.assignedTechnicianId }
        : {}),
      ...(filters.categoryCode ? { categoryCode: filters.categoryCode } : {}),
      ...(filters.segmentId
        ? {
            segmentMemberships: { some: { segmentId: filters.segmentId } },
          }
        : {}),
      ...(filters.certificationScheme
        ? {
            certifications: {
              some: {
                schemeCode: filters.certificationScheme,
                deletedAt: null,
              },
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { legalName: { contains: filters.search, mode: 'insensitive' } },
              { commercialName: { contains: filters.search, mode: 'insensitive' } },
              { documentNumber: { contains: filters.search, mode: 'insensitive' } },
              { producerNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProducerOrderByWithRelationInput = {
      [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc',
    };

    const [items, total] = await Promise.all([
      this.prisma.producer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          producerNumber: true,
          legalName: true,
          commercialName: true,
          documentTypeCode: true,
          documentNumber: true,
          lifecycleStatus: true,
          municipalityCode: true,
          veredaCode: true,
          assignedBuyerId: true,
          assignedTechnicianId: true,
          qualityScore: true,
          riskScore: true,
          lastActivityAt: true,
          categoryCode: true,
          latitude: true,
          longitude: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.producer.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const producer = await this.prisma.producer.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: this.includeRelations,
    });
    if (!producer) throw new NotFoundException('Producer not found');
    return producer;
  }

  async checkDuplicate(
    organizationId: string,
    documentNumber: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.producer.findFirst({
      where: {
        organizationId,
        documentNumber,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: {
        id: true,
        producerNumber: true,
        legalName: true,
        lifecycleStatus: true,
      },
    });
    return { duplicate: !!existing, existing };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateProducerDto,
    ctx?: RequestContext,
  ) {
    const dup = await this.checkDuplicate(organizationId, dto.documentNumber);
    if (dup.duplicate) {
      throw new ConflictException(
        `Ya existe un productor con este documento. Código: ${dup.existing?.producerNumber}`,
      );
    }

    if (dto.externalId) {
      const ext = await this.prisma.producer.findFirst({
        where: { organizationId, externalId: dto.externalId },
      });
      if (ext) return ext;
    }

    const producerNumber =
      dto.producerNumber ??
      (await this.generateProducerNumber(organizationId));

    const producer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.producer.create({
        data: {
          organizationId,
          producerNumber,
          producerTypeCode: dto.producerTypeCode,
          legalName: dto.legalName,
          commercialName: dto.commercialName,
          firstName: dto.firstName,
          lastName: dto.lastName,
          documentTypeCode: dto.documentTypeCode,
          documentNumber: dto.documentNumber,
          taxId: dto.taxId,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          genderCode: dto.genderCode,
          maritalStatusCode: dto.maritalStatusCode,
          nationalityCode: dto.nationalityCode,
          primaryLanguageCode: dto.primaryLanguageCode,
          educationLevelCode: dto.educationLevelCode,
          ethnicGroupCode: dto.ethnicGroupCode,
          categoryCode: dto.categoryCode,
          leadSourceCode: dto.leadSourceCode,
          yearsExperience: dto.yearsExperience,
          photoContentId: dto.photoContentId,
          signatureContentId: dto.signatureContentId,
          taxRegimeCode: dto.taxRegimeCode,
          paymentPreferenceCode: dto.paymentPreferenceCode,
          assignedBuyerId: dto.assignedBuyerId,
          assignedTechnicianId: dto.assignedTechnicianId,
          municipalityCode: dto.municipalityCode,
          veredaCode: dto.veredaCode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          notes: dto.notes,
          tags: dto.tags ?? [],
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          externalId: dto.externalId,
          lifecycleStatus: 'pre_registered',
          createdBy: userId,
          updatedBy: userId,
          lastActivityAt: new Date(),
        },
      });

      await tx.producerLifecycleEvent.create({
        data: {
          organizationId,
          producerId: created.id,
          fromStatus: null,
          toStatus: 'pre_registered',
          actorId: userId,
          reasonNotes: 'Alta inicial',
        },
      });

      return created;
    });

    await this.core.emitProducerCreated(
      organizationId,
      producer.id,
      { producerNumber: producer.producerNumber, documentNumber: producer.documentNumber },
      { ctx: { ...ctx, userId, organizationId }, newValues: producer as unknown as Record<string, unknown> },
    );

    return producer;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateProducerDto,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);

    if (dto.version !== undefined && dto.version !== existing.version) {
      throw new ConflictException('Version conflict — refresh and retry');
    }

    const data: Prisma.ProducerUpdateInput = {
      ...(dto.producerTypeCode !== undefined ? { producerTypeCode: dto.producerTypeCode } : {}),
      ...(dto.legalName !== undefined ? { legalName: dto.legalName } : {}),
      ...(dto.commercialName !== undefined ? { commercialName: dto.commercialName } : {}),
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.documentTypeCode !== undefined ? { documentTypeCode: dto.documentTypeCode } : {}),
      ...(dto.taxId !== undefined ? { taxId: dto.taxId } : {}),
      ...(dto.birthDate !== undefined ? { birthDate: new Date(dto.birthDate) } : {}),
      ...(dto.genderCode !== undefined ? { genderCode: dto.genderCode } : {}),
      ...(dto.maritalStatusCode !== undefined ? { maritalStatusCode: dto.maritalStatusCode } : {}),
      ...(dto.nationalityCode !== undefined ? { nationalityCode: dto.nationalityCode } : {}),
      ...(dto.primaryLanguageCode !== undefined ? { primaryLanguageCode: dto.primaryLanguageCode } : {}),
      ...(dto.educationLevelCode !== undefined ? { educationLevelCode: dto.educationLevelCode } : {}),
      ...(dto.ethnicGroupCode !== undefined ? { ethnicGroupCode: dto.ethnicGroupCode } : {}),
      ...(dto.categoryCode !== undefined ? { categoryCode: dto.categoryCode } : {}),
      ...(dto.leadSourceCode !== undefined ? { leadSourceCode: dto.leadSourceCode } : {}),
      ...(dto.yearsExperience !== undefined ? { yearsExperience: dto.yearsExperience } : {}),
      ...(dto.photoContentId !== undefined ? { photoContentId: dto.photoContentId } : {}),
      ...(dto.signatureContentId !== undefined ? { signatureContentId: dto.signatureContentId } : {}),
      ...(dto.taxRegimeCode !== undefined ? { taxRegimeCode: dto.taxRegimeCode } : {}),
      ...(dto.paymentPreferenceCode !== undefined ? { paymentPreferenceCode: dto.paymentPreferenceCode } : {}),
      ...(dto.assignedBuyerId !== undefined ? { assignedBuyerId: dto.assignedBuyerId } : {}),
      ...(dto.assignedTechnicianId !== undefined ? { assignedTechnicianId: dto.assignedTechnicianId } : {}),
      ...(dto.municipalityCode !== undefined ? { municipalityCode: dto.municipalityCode } : {}),
      ...(dto.veredaCode !== undefined ? { veredaCode: dto.veredaCode } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      updatedBy: userId,
      lastActivityAt: new Date(),
      version: { increment: 1 },
      syncStatus: 'synced',
    };

    const updated = await this.prisma.producer.update({
      where: { id },
      data,
    });

    await this.core.emitProducerUpdated(
      organizationId,
      id,
      { producerNumber: updated.producerNumber },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      },
    );

    return updated;
  }

  async remove(
    organizationId: string,
    id: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);

    const archived = await this.prisma.producer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        lifecycleStatus: 'archived',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.prisma.producerLifecycleEvent.create({
      data: {
        organizationId,
        producerId: id,
        fromStatus: existing.lifecycleStatus,
        toStatus: 'archived',
        actorId: userId,
        reasonNotes: 'Archivado',
      },
    });

    await this.core.emitProducerDeleted(
      organizationId,
      id,
      { producerNumber: existing.producerNumber },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: existing as unknown as Record<string, unknown>,
      },
    );

    return archived;
  }

  async getTimeline(organizationId: string, id: string) {
    await this.findOne(organizationId, id);

    const [lifecycle, audit, events, communications, notes] = await Promise.all([
      this.prisma.producerLifecycleEvent.findMany({
        where: { producerId: id, organizationId },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'Producer', entityId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.event.findMany({
        where: { aggregateType: 'Producer', aggregateId: id, organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      this.prisma.producerCommunication.findMany({
        where: { producerId: id, organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 30,
      }),
      this.prisma.producerNote.findMany({
        where: { producerId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const timeline = [
      ...lifecycle.map((e) => ({
        type: 'lifecycle' as const,
        id: e.id,
        occurredAt: e.occurredAt,
        title: `Estado: ${e.fromStatus ?? '—'} → ${e.toStatus}`,
        detail: e.reasonNotes,
        actorId: e.actorId,
      })),
      ...audit.map((a) => ({
        type: 'audit' as const,
        id: a.id,
        occurredAt: a.createdAt,
        title: a.action,
        detail: null,
        actorId: a.userId,
      })),
      ...events.map((e) => ({
        type: 'event' as const,
        id: e.id,
        occurredAt: e.occurredAt,
        title: e.eventType,
        detail: null,
        actorId: e.userId,
      })),
      ...communications.map((c) => ({
        type: 'communication' as const,
        id: c.id,
        occurredAt: c.occurredAt,
        title: `${c.channelCode} (${c.direction})`,
        detail: c.subject ?? c.body,
        actorId: c.createdBy,
      })),
      ...notes.map((n) => ({
        type: 'note' as const,
        id: n.id,
        occurredAt: n.createdAt,
        title: 'Nota',
        detail: n.content,
        actorId: n.createdBy,
      })),
    ].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    return { items: timeline };
  }

  async get360(organizationId: string, id: string) {
    const producer = await this.findOne(organizationId, id);

    const [assignments, indicators, purchases, farms] = await Promise.all([
      this.prisma.producerAssignment.findMany({
        where: { producerId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.producerIndicatorSnapshot.findMany({
        where: { producerId: id, organizationId },
        orderBy: { capturedAt: 'desc' },
        take: 12,
      }),
      this.prisma.cpepReceptionTicket.findMany({
        where: { organizationId, producerId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          quality: { select: { qualityScore: true, grade: true } },
          settlement: { select: { totalAmount: true, netWeightKg: true } },
        },
      }),
      producer.territoryLinks.length > 0
        ? this.prisma.farmUnit.findMany({
            where: {
              id: { in: producer.territoryLinks.map((t) => t.farmUnitId) },
              organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              farmCode: true,
              farmName: true,
              status: true,
              totalAreaHa: true,
              municipalityCode: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      profile: producer,
      assignments,
      indicators,
      purchases,
      farms,
      scores: {
        risk: producer.riskScore,
        quality: producer.qualityScore,
        lifetimeValue: producer.lifetimeValueScore,
      },
    };
  }

  async getIndicators(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const snapshots = await this.prisma.producerIndicatorSnapshot.findMany({
      where: { producerId: id, organizationId },
      orderBy: { capturedAt: 'desc' },
      take: 24,
    });
    const producer = await this.prisma.producer.findUnique({
      where: { id },
      select: { riskScore: true, qualityScore: true, lifetimeValueScore: true },
    });
    return { current: producer, history: snapshots };
  }

  async getDashboard(organizationId: string) {
    const [
      total,
      byStatus,
      byMunicipality,
      recentActivations,
      expiringCerts,
      avgQuality,
    ] = await Promise.all([
      this.prisma.producer.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.producer.groupBy({
        by: ['lifecycleStatus'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.producer.groupBy({
        by: ['municipalityCode'],
        where: { organizationId, deletedAt: null, municipalityCode: { not: null } },
        _count: true,
        orderBy: { _count: { municipalityCode: 'desc' } },
        take: 10,
      }),
      this.prisma.producer.count({
        where: {
          organizationId,
          deletedAt: null,
          activatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.producerCertification.count({
        where: {
          organizationId,
          deletedAt: null,
          expiresAt: {
            lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      this.prisma.producer.aggregate({
        where: { organizationId, deletedAt: null, lifecycleStatus: 'active' },
        _avg: { qualityScore: true, riskScore: true },
      }),
    ]);

    return {
      kpis: {
        total,
        active: byStatus.find((s) => s.lifecycleStatus === 'active')?._count ?? 0,
        pendingApproval:
          byStatus.find((s) => s.lifecycleStatus === 'pending_approval')?._count ?? 0,
        suspended:
          byStatus.find((s) => s.lifecycleStatus === 'suspended')?._count ?? 0,
        recentActivations,
        expiringCertifications: expiringCerts,
        avgQualityScore: Math.round(avgQuality._avg.qualityScore ?? 0),
        avgRiskScore: Math.round(avgQuality._avg.riskScore ?? 0),
      },
      byStatus: byStatus.map((s) => ({
        status: s.lifecycleStatus,
        count: s._count,
      })),
      byMunicipality: byMunicipality.map((m) => ({
        municipalityCode: m.municipalityCode,
        count: m._count,
      })),
    };
  }

  async getMapData(organizationId: string, filters: ProducerListFilters = {}) {
    const result = await this.findAll(organizationId, {
      ...filters,
      limit: 500,
    });
    return {
      items: result.items
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          producerNumber: p.producerNumber,
          legalName: p.legalName,
          lifecycleStatus: p.lifecycleStatus,
          municipalityCode: p.municipalityCode,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          qualityScore: p.qualityScore,
        })),
    };
  }

  async exportCsv(organizationId: string, filters: ProducerListFilters = {}) {
    const result = await this.findAll(organizationId, { ...filters, limit: 10000 });
    const header =
      'producerNumber,legalName,documentNumber,lifecycleStatus,municipalityCode,categoryCode,qualityScore,lastActivityAt';
    const rows = result.items.map((p) =>
      [
        p.producerNumber,
        `"${p.legalName.replace(/"/g, '""')}"`,
        p.documentNumber,
        p.lifecycleStatus,
        p.municipalityCode ?? '',
        p.categoryCode ?? '',
        p.qualityScore,
        p.lastActivityAt?.toISOString() ?? '',
      ].join(','),
    );
    return { csv: [header, ...rows].join('\n'), count: result.items.length };
  }

  async importBatch(
    organizationId: string,
    userId: string,
    items: CreateProducerDto[],
    ctx?: RequestContext,
  ) {
    const results: Array<{ index: number; producerId?: string; error?: string }> = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const producer = await this.create(organizationId, userId, items[i], ctx);
        results.push({ index: i, producerId: producer.id });
      } catch (err) {
        results.push({
          index: i,
          error: err instanceof Error ? err.message : 'Error',
        });
      }
    }
    return { results, imported: results.filter((r) => r.producerId).length };
  }

  private async generateProducerNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.producer.count({ where: { organizationId } });
    const seq = (count + 1).toString().padStart(6, '0');
    return `PRM-${seq}`;
  }
}
