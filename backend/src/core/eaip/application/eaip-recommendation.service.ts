import { Injectable } from '@nestjs/common';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { computeRecommendationScore, generateEaipKey } from '../domain/eaip.engine';
import { EaipAuditService } from './eaip-audit.service';

@Injectable()
export class EaipRecommendationService {
  constructor(
    private readonly prisma: EaipPrismaService,
    private readonly audit: EaipAuditService,
  ) {}

  list(organizationId: string, category?: string) {
    return this.prisma.eaipRecommendation.findMany({
      where: { organizationId, status: 'active', ...(category ? { category } : {}) },
      orderBy: { score: 'desc' },
    });
  }

  async generate(
    organizationId: string,
    userId: string,
    data: {
      category: string; title: string; description: string;
      fieldLotId?: string; cropCode?: string;
      factors?: Record<string, number>;
    },
  ) {
    const { score, priority } = computeRecommendationScore(data.factors ?? {});
    const count = await this.prisma.eaipRecommendation.count({ where: { organizationId } });
    const recommendationKey = generateEaipKey('REC', count + 1);
    const row = await this.prisma.eaipRecommendation.create({
      data: {
        organizationId, recommendationKey, category: data.category, title: data.title,
        description: data.description, fieldLotId: data.fieldLotId, cropCode: data.cropCode,
        score, priority, factors: (data.factors ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EaipRecommendation', recommendationKey, 'recommendation_generated', userId);
    return row;
  }
}
