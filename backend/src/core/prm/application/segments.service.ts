import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CreateSegmentDto } from '../presentation/producers.dto';

@Injectable()
export class SegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.producerSegment.findMany({
      where: { organizationId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const segment = await this.prisma.producerSegment.findFirst({
      where: { id, organizationId },
    });
    if (!segment) throw new NotFoundException('Segment not found');
    return segment;
  }

  async create(organizationId: string, userId: string, dto: CreateSegmentDto) {
    const existing = await this.prisma.producerSegment.findFirst({
      where: { organizationId, slug: dto.slug },
    });
    if (existing) throw new ConflictException('Segment slug already exists');

    const segment = await this.prisma.producerSegment.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        rules: (dto.rules ?? []) as Prisma.InputJsonValue,
        isDynamic: dto.isDynamic ?? true,
        createdBy: userId,
      },
    });

    if (dto.isDynamic !== false) {
      await this.recalculate(organizationId, segment.id);
    }

    return segment;
  }

  async getProducers(
    organizationId: string,
    segmentId: string,
    page = 1,
    limit = 25,
  ) {
    await this.findOne(organizationId, segmentId);
    const skip = (page - 1) * limit;
    const [memberships, total] = await Promise.all([
      this.prisma.producerSegmentMembership.findMany({
        where: { segmentId, organizationId },
        include: {
          producer: {
            select: {
              id: true,
              producerNumber: true,
              legalName: true,
              lifecycleStatus: true,
              municipalityCode: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.producerSegmentMembership.count({
        where: { segmentId, organizationId },
      }),
    ]);
    return {
      items: memberships.map((m) => m.producer),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async recalculate(organizationId: string, segmentId: string) {
    const segment = await this.findOne(organizationId, segmentId);
    const rules = segment.rules as Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;

    const where: Prisma.ProducerWhereInput = {
      organizationId,
      deletedAt: null,
    };

    for (const rule of rules) {
      if (rule.operator === 'eq' && rule.field && rule.value !== undefined) {
        (where as Record<string, unknown>)[rule.field] = rule.value;
      }
      if (rule.operator === 'in' && rule.field && Array.isArray(rule.value)) {
        (where as Record<string, unknown>)[rule.field] = { in: rule.value };
      }
    }

    const matching = await this.prisma.producer.findMany({
      where,
      select: { id: true },
    });

    await this.prisma.producerSegmentMembership.deleteMany({
      where: { segmentId, organizationId },
    });

    if (matching.length > 0) {
      await this.prisma.producerSegmentMembership.createMany({
        data: matching.map((p) => ({
          organizationId,
          segmentId,
          producerId: p.id,
          source: 'rule',
        })),
      });
    }

    await this.prisma.producerSegment.update({
      where: { id: segmentId },
      data: { memberCount: matching.length },
    });

    return { segmentId, memberCount: matching.length };
  }
}
