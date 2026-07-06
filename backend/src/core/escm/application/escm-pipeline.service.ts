import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';
import { ESCM_DEFAULT_PIPELINE_STAGES } from '../domain/escm.catalogs';

@Injectable()
export class EscmPipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, all = false) {
    return this.prisma.escmPipelineStage.findMany({
      where: { organizationId, ...(all ? {} : { isActive: true }) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async seedDefaults(organizationId: string, userId: string) {
    let count = 0;
    for (const stage of ESCM_DEFAULT_PIPELINE_STAGES) {
      await this.prisma.escmPipelineStage.upsert({
        where: {
          organizationId_stageKey: { organizationId, stageKey: stage.stageKey },
        },
        update: {
          name: stage.name,
          sortOrder: stage.sortOrder,
          defaultProbability: stage.defaultProbability,
          isClosed: stage.isClosed ?? false,
          isWon: stage.isWon ?? false,
          isLost: stage.isLost ?? false,
          isArchived: stage.isArchived ?? false,
          isActive: true,
          updatedBy: userId,
        },
        create: {
          organizationId,
          stageKey: stage.stageKey,
          name: stage.name,
          sortOrder: stage.sortOrder,
          defaultProbability: stage.defaultProbability,
          isClosed: stage.isClosed ?? false,
          isWon: stage.isWon ?? false,
          isLost: stage.isLost ?? false,
          isArchived: stage.isArchived ?? false,
          createdBy: userId,
        },
      });
      count += 1;
    }
    await this.audit.log(organizationId, 'Pipeline', 'seed', 'seeded', userId, { count });
    return { count };
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      stageKey: string;
      name: string;
      sortOrder?: number;
      defaultProbability?: number;
      isClosed?: boolean;
      isWon?: boolean;
      isLost?: boolean;
      isArchived?: boolean;
      color?: string;
      isActive?: boolean;
    },
  ) {
    const row = await this.prisma.escmPipelineStage.upsert({
      where: { organizationId_stageKey: { organizationId, stageKey: input.stageKey } },
      update: {
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
        defaultProbability: input.defaultProbability ?? 0,
        isClosed: input.isClosed ?? false,
        isWon: input.isWon ?? false,
        isLost: input.isLost ?? false,
        isArchived: input.isArchived ?? false,
        color: input.color,
        isActive: input.isActive ?? true,
        updatedBy: userId,
      },
      create: {
        organizationId,
        stageKey: input.stageKey,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
        defaultProbability: input.defaultProbability ?? 0,
        isClosed: input.isClosed ?? false,
        isWon: input.isWon ?? false,
        isLost: input.isLost ?? false,
        isArchived: input.isArchived ?? false,
        color: input.color,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'PipelineStage', row.stageKey, 'upserted', userId);
    return row;
  }

  async getStageMap(organizationId: string) {
    const stages = await this.list(organizationId);
    return new Map(stages.map((s) => [s.stageKey, s]));
  }
}
