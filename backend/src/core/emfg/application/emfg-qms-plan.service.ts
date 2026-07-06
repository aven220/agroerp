import { Injectable } from '@nestjs/common';
import { EmfgQmsPlanScope } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';

@Injectable()
export class EmfgQmsPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  list(organizationId: string, scope?: EmfgQmsPlanScope) {
    return this.prisma.emfgQmsInspectionPlan.findMany({
      where: { organizationId, ...(scope ? { scope } : {}), isActive: true },
      include: { criteria: { orderBy: { sequence: 'asc' } } },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });
  }

  get(organizationId: string, planKey: string) {
    return this.prisma.emfgQmsInspectionPlan.findUnique({
      where: { organizationId_planKey: { organizationId, planKey } },
      include: { criteria: { orderBy: { sequence: 'asc' } } },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    name: string; scope: EmfgQmsPlanScope; itemKey?: string; supplierKey?: string;
    processKey?: string; frequency?: string;
    criteria?: Array<{
      name: string; unit?: string; minValue?: number; maxValue?: number;
      targetValue?: number; acceptText?: string; rejectText?: string; sequence?: number;
    }>;
  }) {
    const seq = await this.prisma.emfgQmsInspectionPlan.count({ where: { organizationId } });
    const planKey = generateEmfgKey('QP', seq + 1);

    const plan = await this.prisma.emfgQmsInspectionPlan.create({
      data: {
        organizationId,
        planKey,
        name: payload.name,
        scope: payload.scope,
        itemKey: payload.itemKey,
        supplierKey: payload.supplierKey,
        processKey: payload.processKey,
        frequency: payload.frequency ?? 'each_lot',
        createdBy: userId,
        criteria: payload.criteria?.length
          ? {
              create: payload.criteria.map((c, i) => ({
                organizationId,
                criterionKey: generateEmfgKey('QC', seq * 10 + i + 1),
                name: c.name,
                unit: c.unit,
                minValue: c.minValue,
                maxValue: c.maxValue,
                targetValue: c.targetValue,
                acceptText: c.acceptText,
                rejectText: c.rejectText,
                sequence: c.sequence ?? (i + 1) * 10,
              })),
            }
          : undefined,
      },
      include: { criteria: true },
    });

    await this.audit.log(organizationId, 'EmfgQmsInspectionPlan', planKey, 'created', userId, { scope: payload.scope });
    return plan;
  }

  async newVersion(organizationId: string, userId: string, planKey: string) {
    const existing = await this.get(organizationId, planKey);
    if (!existing) return null;

    await this.prisma.emfgQmsInspectionPlan.update({
      where: { organizationId_planKey: { organizationId, planKey } },
      data: { isActive: false },
    });

    const seq = await this.prisma.emfgQmsInspectionPlan.count({ where: { organizationId } });
    const newKey = generateEmfgKey('QP', seq + 1);

    return this.prisma.emfgQmsInspectionPlan.create({
      data: {
        organizationId,
        planKey: newKey,
        name: existing.name,
        scope: existing.scope,
        itemKey: existing.itemKey,
        supplierKey: existing.supplierKey,
        processKey: existing.processKey,
        version: existing.version + 1,
        frequency: existing.frequency,
        createdBy: userId,
        criteria: {
          create: existing.criteria.map((c, i) => ({
            organizationId,
            criterionKey: generateEmfgKey('QC', seq * 10 + i + 1),
            name: c.name,
            unit: c.unit,
            minValue: c.minValue,
            maxValue: c.maxValue,
            targetValue: c.targetValue,
            acceptText: c.acceptText,
            rejectText: c.rejectText,
            sequence: c.sequence,
          })),
        },
      },
      include: { criteria: true },
    });
  }
}
