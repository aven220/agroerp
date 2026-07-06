import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { DEFAULT_PARAMETERS } from '../domain/efm.catalogs';

@Injectable()
export class EfmParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.efmParameter.findMany({
      where: { organizationId },
      orderBy: { parameterKey: 'asc' },
    });
  }

  get(organizationId: string, parameterKey: string) {
    return this.prisma.efmParameter.findFirst({ where: { organizationId, parameterKey } });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: { parameterKey: string; name: string; value: Record<string, unknown>; dataType?: string },
  ) {
    const existing = await this.get(organizationId, input.parameterKey);
    const row = await this.prisma.efmParameter.upsert({
      where: {
        organizationId_parameterKey: { organizationId, parameterKey: input.parameterKey },
      },
      update: {
        name: input.name,
        value: input.value as object,
        dataType: input.dataType ?? 'json',
        versionNumber: (existing?.versionNumber ?? 0) + 1,
        updatedBy: userId,
      },
      create: {
        organizationId,
        parameterKey: input.parameterKey,
        name: input.name,
        value: input.value as object,
        dataType: input.dataType ?? 'json',
        updatedBy: userId,
      },
    });
    await this.audit.log(
      organizationId,
      'EfmParameter',
      input.parameterKey,
      'updated',
      userId,
      { value: input.value },
      row.versionNumber,
    );
    await this.core.emitUserAction(organizationId, 'EfmParameter', input.parameterKey, EVENT_TYPES.EFM_PARAMETER_UPDATED, {
      parameterKey: input.parameterKey,
    });
    return row;
  }

  async seed(organizationId: string, userId: string) {
    for (const p of DEFAULT_PARAMETERS) {
      await this.upsert(organizationId, userId, {
        parameterKey: p.parameterKey,
        name: p.name,
        value: p.value as Record<string, unknown>,
      });
    }
    return this.list(organizationId);
  }
}
