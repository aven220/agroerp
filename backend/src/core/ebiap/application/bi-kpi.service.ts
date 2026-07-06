import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiVisualQueryDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BiQueryEngineService } from './bi-query-engine.service';
import { BiKpiEngine, KpiAlertRule } from './bi-kpi.engine';

@Injectable()
export class BiKpiService {
  private readonly engine = new BiKpiEngine();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryEngine: BiQueryEngineService,
  ) {}

  async findAll(organizationId: string, activeOnly = true) {
    return this.prisma.biKpiDefinition.findMany({
      where: { organizationId, ...(activeOnly ? { active: true } : {}) },
      orderBy: { name: 'asc' },
      include: {
        history: { orderBy: { capturedAt: 'desc' }, take: 1 },
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    const kpi = await this.prisma.biKpiDefinition.findFirst({
      where: { id, organizationId },
      include: {
        history: { orderBy: { capturedAt: 'desc' }, take: 100 },
      },
    });
    if (!kpi) throw new NotFoundException('KPI no encontrado');
    return kpi;
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      kpiKey: string;
      name: string;
      description?: string;
      targetValue?: number;
      goalValue?: number;
      frequency?: string;
      color?: string;
      alertRules?: KpiAlertRule[];
      queryDef?: BiVisualQueryDefinition;
      responsibleId?: string;
      unit?: string;
    },
  ) {
    const exists = await this.prisma.biKpiDefinition.findFirst({
      where: { organizationId, kpiKey: data.kpiKey },
    });
    if (exists) throw new BadRequestException('kpiKey ya existe');

    return this.prisma.biKpiDefinition.create({
      data: {
        organizationId,
        kpiKey: data.kpiKey,
        name: data.name,
        description: data.description,
        targetValue: data.targetValue,
        goalValue: data.goalValue,
        frequency: (data.frequency ?? 'daily') as 'daily',
        color: data.color ?? '#1b5e3b',
        alertRules: (data.alertRules ?? []) as object[],
        queryDef: (data.queryDef ?? {}) as object,
        responsibleId: data.responsibleId,
        unit: data.unit,
        createdBy: userId,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      name: string;
      description: string;
      targetValue: number;
      goalValue: number;
      frequency: string;
      color: string;
      alertRules: KpiAlertRule[];
      queryDef: BiVisualQueryDefinition;
      responsibleId: string;
      unit: string;
      active: boolean;
    }>,
  ) {
    await this.findOne(organizationId, id);
    return this.prisma.biKpiDefinition.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.targetValue !== undefined ? { targetValue: data.targetValue } : {}),
        ...(data.goalValue !== undefined ? { goalValue: data.goalValue } : {}),
        ...(data.frequency ? { frequency: data.frequency as 'daily' } : {}),
        ...(data.color ? { color: data.color } : {}),
        ...(data.alertRules ? { alertRules: data.alertRules as object[] } : {}),
        ...(data.queryDef ? { queryDef: data.queryDef as object } : {}),
        ...(data.responsibleId !== undefined ? { responsibleId: data.responsibleId } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.biKpiDefinition.update({
      where: { id },
      data: { active: false },
    });
  }

  async getHistory(organizationId: string, id: string, limit = 365) {
    await this.findOne(organizationId, id);
    return this.prisma.biKpiHistory.findMany({
      where: { kpiId: id },
      orderBy: { capturedAt: 'desc' },
      take: limit,
    });
  }

  async captureValue(organizationId: string, id: string, value?: number) {
    const kpi = await this.findOne(organizationId, id);
    let resolved = value;
    if (resolved === undefined) {
      const queryDef = kpi.queryDef as unknown as BiVisualQueryDefinition;
      if (queryDef?.dataSource) {
        const result = await this.queryEngine.execute(organizationId, queryDef);
        const firstRow = result.rows[0];
        const numericKey = Object.keys(firstRow ?? {}).find(
          (k) => typeof firstRow[k] === 'number',
        );
        resolved = numericKey ? Number(firstRow[numericKey]) : result.rowCount;
      } else {
        resolved = 0;
      }
    }

    const target = kpi.targetValue ? Number(kpi.targetValue) : null;
    const variancePct = this.engine.computeVariance(resolved, target);
    const alerts = this.engine.evaluateAlerts(
      resolved,
      target,
      (kpi.alertRules as unknown as KpiAlertRule[]) ?? [],
    );

    const history = await this.prisma.biKpiHistory.create({
      data: {
        kpiId: id,
        value: resolved,
        targetValue: target,
        variancePct,
        metadata: { alerts } as object,
      },
    });

    return { kpi, value: resolved, variancePct, alerts, history };
  }

  async captureAll(organizationId: string) {
    const kpis = await this.findAll(organizationId);
    const results = [];
    for (const kpi of kpis) {
      try {
        results.push(await this.captureValue(organizationId, kpi.id));
      } catch {
        /* skip failed kpi */
      }
    }
    return results;
  }

  async getRealtime(organizationId: string) {
    const kpis = await this.prisma.biKpiDefinition.findMany({
      where: { organizationId, active: true },
      include: { history: { orderBy: { capturedAt: 'desc' }, take: 1 } },
    });
    return kpis.map((k) => ({
      id: k.id,
      kpiKey: k.kpiKey,
      name: k.name,
      color: k.color,
      unit: k.unit,
      targetValue: k.targetValue ? Number(k.targetValue) : null,
      goalValue: k.goalValue ? Number(k.goalValue) : null,
      currentValue: k.history[0] ? Number(k.history[0].value) : null,
      variancePct: k.history[0]?.variancePct ? Number(k.history[0].variancePct) : null,
      capturedAt: k.history[0]?.capturedAt ?? null,
      frequency: k.frequency,
    }));
  }
}
