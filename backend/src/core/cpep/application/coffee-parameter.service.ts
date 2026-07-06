import { Injectable, NotFoundException } from '@nestjs/common';
import { CpepParameterDefinition, EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeConfigChangelogService } from './coffee-config-changelog.service';

@Injectable()
export class CoffeeParameterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly changelog: CoffeeConfigChangelogService,
  ) {}

  list(organizationId: string, parameterKey?: string) {
    return this.prisma.cpepParameter.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(parameterKey ? { parameterKey } : {}),
      },
      orderBy: [{ parameterKey: 'asc' }, { scopeType: 'asc' }],
    });
  }

  async resolve(
    organizationId: string,
    parameterKey: string,
    scopes: Array<{ scopeType: string; scopeRef?: string }> = [{ scopeType: 'organization' }],
  ) {
    for (const scope of scopes) {
      const scopeRef = scope.scopeRef ?? '';
      const row = await this.prisma.cpepParameter.findFirst({
        where: {
          organizationId,
          parameterKey,
          scopeType: scope.scopeType as 'organization',
          scopeRef,
          isActive: true,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
        orderBy: { version: 'desc' },
      });
      if (row) return row;
    }
    return null;
  }

  async upsert(organizationId: string, userId: string, dto: CpepParameterDefinition, reason?: string) {
    const scopeType = (dto.scopeType ?? 'organization') as 'organization';
    const scopeRef = dto.scopeRef ?? '';
    const existing = await this.prisma.cpepParameter.findUnique({
      where: {
        organizationId_parameterKey_scopeType_scopeRef: {
          organizationId,
          parameterKey: dto.parameterKey,
          scopeType,
          scopeRef,
        },
      },
    });

    const row = await this.prisma.cpepParameter.upsert({
      where: {
        organizationId_parameterKey_scopeType_scopeRef: {
          organizationId,
          parameterKey: dto.parameterKey,
          scopeType,
          scopeRef,
        },
      },
      update: {
        name: dto.name,
        value: dto.value as object,
        dataType: dto.dataType ?? 'json',
        isActive: true,
        version: { increment: 1 },
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        updatedBy: userId,
      },
      create: {
        organizationId,
        parameterKey: dto.parameterKey,
        name: dto.name,
        scopeType,
        scopeRef,
        value: dto.value as object,
        dataType: dto.dataType ?? 'json',
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.changelog.record({
      organizationId,
      entityType: 'Parameter',
      entityKey: `${dto.parameterKey}:${scopeType}:${scopeRef || 'org'}`,
      action: existing ? 'update' : 'create',
      version: row.version,
      previousValue: existing ?? undefined,
      newValue: row,
      reason,
      userId,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeParameter',
      row.id,
      EVENT_TYPES.COFFEE_PARAMETER_UPDATED,
      { parameterKey: dto.parameterKey, scopeType, scopeRef },
    );
    return row;
  }

  async deactivate(organizationId: string, id: string, userId: string, reason?: string) {
    const existing = await this.prisma.cpepParameter.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException('Parámetro no encontrado');
    const row = await this.prisma.cpepParameter.update({
      where: { id },
      data: { isActive: false, version: { increment: 1 }, updatedBy: userId },
    });
    await this.changelog.record({
      organizationId,
      entityType: 'Parameter',
      entityKey: existing.parameterKey,
      action: 'deactivate',
      version: row.version,
      previousValue: existing,
      newValue: row,
      reason,
      userId,
    });
    return row;
  }

  async seedDefaults(organizationId: string, userId: string) {
    const defaults: CpepParameterDefinition[] = [
      {
        parameterKey: 'base_price_by_coffee_type',
        name: 'Precio base por tipo de café',
        value: { pergamino: 12000, cereza: 4500, excelso: 15000 },
      },
      {
        parameterKey: 'auto_bonuses',
        name: 'Bonificaciones automáticas',
        value: {
          rules: [
            { code: 'premium_quality', amount: 100, condition: { grade: 'premium' } },
            { code: 'excelso_quality', amount: 200, condition: { grade: 'excelso' } },
            { code: 'high_factor', amount: 50, condition: { minFactor: 94 } },
          ],
        },
      },
      {
        parameterKey: 'auto_penalties',
        name: 'Castigos automáticos',
        value: {
          rules: [
            { code: 'humidity_penalty', amount: 80, condition: { maxHumidity: 12.5 } },
            { code: 'low_factor', amount: 60, condition: { maxFactor: 88 } },
          ],
        },
      },
      {
        parameterKey: 'humidity_ranges',
        name: 'Rangos de humedad',
        value: { min: 10, max: 12.5, rejectAbove: 14 },
      },
      {
        parameterKey: 'quality_ranges',
        name: 'Rangos de calidad',
        value: { minScore: 70, premiumMin: 85, excelsoMin: 90 },
      },
      {
        parameterKey: 'factor_ranges',
        name: 'Rangos de factor',
        value: { min: 85, target: 92, max: 100 },
      },
      {
        parameterKey: 'reception_limits',
        name: 'Límites de recepción',
        value: { maxTicketsDay: 200, maxKgDay: 100000 },
      },
      {
        parameterKey: 'reception_schedule',
        name: 'Horario de recepción',
        value: { openTime: '06:00', closeTime: '18:00', timezone: 'America/Bogota' },
      },
    ];
    for (const d of defaults) {
      await this.upsert(organizationId, userId, d, 'seed defaults');
    }
    return { seeded: defaults.length };
  }
}
