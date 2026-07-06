import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { ESCM_DEFAULT_PARAMETERS } from '../domain/escm.catalogs';

@Injectable()
export class EscmParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.escmParameter.findMany({
      where: { organizationId, isActive: true },
      orderBy: { parameterKey: 'asc' },
    });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: { parameterKey: string; name: string; value: Record<string, unknown>; dataType?: string },
  ) {
    const row = await this.prisma.escmParameter.upsert({
      where: { organizationId_parameterKey: { organizationId, parameterKey: input.parameterKey } },
      update: {
        name: input.name,
        value: input.value as object,
        dataType: input.dataType ?? 'json',
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
    await this.audit.log(organizationId, 'Parameter', input.parameterKey, 'upsert', userId, input.value);
    await this.core.emitUserAction(
      organizationId,
      'EscmParameter',
      row.id,
      EVENT_TYPES.ESCM_PARAMETER_UPDATED,
      { parameterKey: input.parameterKey },
    );
    return row;
  }

  async seedDefaults(organizationId: string, userId: string) {
    let count = 0;
    for (const p of ESCM_DEFAULT_PARAMETERS) {
      await this.upsert(organizationId, userId, p);
      count += 1;
    }
    return { count };
  }
}
