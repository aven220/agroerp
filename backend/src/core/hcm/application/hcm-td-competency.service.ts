import { BadRequestException, Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import {
  buildSkillMatrix,
  computeCompetencyGap,
  DEFAULT_TD_COMPETENCIES,
  generateTdKey,
  mergeBulkCompetencyImport,
  type ProficiencyLevel,
} from '../domain/hcm-talent-development.engine';
import type { HcmTdCompetencyType, HcmTdProficiencyLevel } from '@prisma/client';

@Injectable()
export class HcmTdCompetencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.hcmTdCompetency.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } });
  }

  listEmployeeCompetencies(organizationId: string, employeeKey?: string) {
    return this.prisma.hcmTdEmployeeCompetency.findMany({
      where: { organizationId, ...(employeeKey ? { employeeKey } : {}) },
      include: { competency: true },
      orderBy: { gapScore: 'desc' },
    });
  }

  async skillMatrix(organizationId: string, departmentKey?: string) {
    const competencies = await this.list(organizationId);
    let employeeKeys: string[] | undefined;
    if (departmentKey) {
      const emps = await this.prisma.hcmEmployee.findMany({
        where: { organizationId, departmentKey, employmentStatus: 'active' },
        select: { employeeKey: true },
      });
      employeeKeys = emps.map((e) => e.employeeKey);
    }
    const levels = await this.prisma.hcmTdEmployeeCompetency.findMany({
      where: {
        organizationId,
        ...(employeeKeys ? { employeeKey: { in: employeeKeys } } : {}),
      },
      include: { competency: true },
    });
    return buildSkillMatrix(competencies, levels.map((l) => ({
      employeeKey: l.employeeKey,
      competencyKey: l.competencyKey,
      currentLevel: l.currentLevel,
      targetLevel: l.targetLevel,
      gapScore: l.gapScore,
    })));
  }

  async seedDefaults(organizationId: string, userId: string) {
    for (const [i, c] of DEFAULT_TD_COMPETENCIES.entries()) {
      await this.prisma.hcmTdCompetency.create({
        data: {
          organizationId,
          competencyKey: generateTdKey('CMP', i + 1),
          code: c.code,
          name: c.name,
          competencyType: c.competencyType as HcmTdCompetencyType,
        },
      });
    }
    await this.audit.log(organizationId, 'HcmTdCompetency', 'defaults', 'seeded', userId);
  }

  async upsert(organizationId: string, userId: string, input: {
    competencyKey?: string; code: string; name: string;
    competencyType: HcmTdCompetencyType; description?: string;
  }) {
    if (input.competencyKey) {
      const existing = await this.prisma.hcmTdCompetency.findFirst({ where: { organizationId, competencyKey: input.competencyKey } });
      if (existing) {
        return this.prisma.hcmTdCompetency.update({
          where: { id: existing.id },
          data: { name: input.name, description: input.description },
        });
      }
    }
    const competencyKey = input.competencyKey ?? generateTdKey('CMP', (await this.prisma.hcmTdCompetency.count({ where: { organizationId } })) + 1);
    const comp = await this.prisma.hcmTdCompetency.create({
      data: {
        organizationId, competencyKey, code: input.code, name: input.name,
        competencyType: input.competencyType, description: input.description,
      },
    });
    await this.audit.log(organizationId, 'HcmTdCompetency', competencyKey, 'created', userId);
    return comp;
  }

  async assessEmployee(organizationId: string, userId: string, input: {
    employeeKey: string; competencyKey: string;
    currentLevel: HcmTdProficiencyLevel; targetLevel: HcmTdProficiencyLevel;
    improvementPlan?: string;
  }) {
    if (!input.competencyKey) throw new BadRequestException('Competencia requerida');
    const gapScore = computeCompetencyGap(
      input.currentLevel as ProficiencyLevel,
      input.targetLevel as ProficiencyLevel,
    );
    const existing = await this.prisma.hcmTdEmployeeCompetency.findFirst({
      where: { organizationId, employeeKey: input.employeeKey, competencyKey: input.competencyKey },
    });
    if (existing) {
      const updated = await this.prisma.hcmTdEmployeeCompetency.update({
        where: { id: existing.id },
        data: {
          currentLevel: input.currentLevel, targetLevel: input.targetLevel,
          gapScore, improvementPlan: input.improvementPlan, assessedAt: new Date(),
        },
      });
      await this.audit.log(organizationId, 'HcmTdEmployeeCompetency', existing.recordKey, 'updated', userId, { gapScore });
      await this.core.emitUserAction(organizationId, 'HcmTdEmployeeCompetency', existing.recordKey, EVENT_TYPES.HCM_TD_COMPETENCY_ASSESSED, { gapScore });
      return updated;
    }
    const recordKey = generateTdKey('ECM', (await this.prisma.hcmTdEmployeeCompetency.count({ where: { organizationId } })) + 1);
    const record = await this.prisma.hcmTdEmployeeCompetency.create({
      data: {
        organizationId, recordKey, employeeKey: input.employeeKey,
        competencyKey: input.competencyKey,
        currentLevel: input.currentLevel, targetLevel: input.targetLevel,
        gapScore, improvementPlan: input.improvementPlan, assessedAt: new Date(),
      },
    });
    await this.audit.log(organizationId, 'HcmTdEmployeeCompetency', recordKey, 'assessed', userId, { gapScore });
    await this.core.emitUserAction(organizationId, 'HcmTdEmployeeCompetency', recordKey, EVENT_TYPES.HCM_TD_COMPETENCY_ASSESSED, { gapScore });
    return record;
  }

  async bulkImport(organizationId: string, userId: string, rows: Array<{
    employeeKey: string; competencyKey: string;
    currentLevel: HcmTdProficiencyLevel; targetLevel: HcmTdProficiencyLevel;
    improvementPlan?: string;
  }>) {
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      const k = `${r.employeeKey}:${r.competencyKey}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const results = [];
    for (const row of unique) {
      results.push(await this.assessEmployee(organizationId, userId, row));
    }
    await this.audit.log(organizationId, 'HcmTdCompetency', 'bulk', 'imported', userId, { count: results.length });
    return { imported: results.length, records: results };
  }
}
