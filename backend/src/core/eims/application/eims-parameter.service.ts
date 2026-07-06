import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EIMS_DEFAULT_PARAMETERS } from '../domain/eims.catalogs';

@Injectable()
export class EimsParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eimsParameter.findMany({
      where: { organizationId },
      orderBy: { parameterKey: 'asc' },
    });
  }

  async resolve(organizationId: string, parameterKey: string) {
    return this.prisma.eimsParameter.findFirst({
      where: { organizationId, parameterKey, isActive: true },
    });
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: { parameterKey: string; name: string; value: Record<string, unknown>; dataType?: string },
  ) {
    const existing = await this.prisma.eimsParameter.findUnique({
      where: { organizationId_parameterKey: { organizationId, parameterKey: input.parameterKey } },
    });
    const row = await this.prisma.eimsParameter.upsert({
      where: { organizationId_parameterKey: { organizationId, parameterKey: input.parameterKey } },
      update: {
        name: input.name,
        value: input.value as object,
        dataType: input.dataType ?? 'json',
        version: { increment: 1 },
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
    await this.audit.log(organizationId, 'Parameter', input.parameterKey, existing ? 'update' : 'create', userId, {
      value: input.value,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsParameter',
      row.id,
      EVENT_TYPES.EIMS_PARAMETER_UPDATED,
      { parameterKey: input.parameterKey },
    );
    return row;
  }

  async seedDefaults(organizationId: string, userId: string) {
    const created = [];
    for (const p of EIMS_DEFAULT_PARAMETERS) {
      created.push(await this.upsert(organizationId, userId, p));
    }
    return { count: created.length };
  }
}
