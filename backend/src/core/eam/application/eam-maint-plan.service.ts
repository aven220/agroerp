import { Injectable } from '@nestjs/common';
import { EamMaintPlanType, EamMaintPriority } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamCmmsKey } from '../domain/eam-cmms.engine';
import { EamAuditService } from './eam-audit.service';

@Injectable()
export class EamMaintPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
  ) {}

  list(organizationId: string, assetKey?: string) {
    return this.prisma.eamMaintPlan.findMany({
      where: { organizationId, isActive: true, ...(assetKey ? { assetKey } : {}) },
      include: { activities: true },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    assetKey: string,
    name: string,
    planType: EamMaintPlanType,
    priority: EamMaintPriority,
    frequencyValue: number,
    frequencyUnit: string,
    checklistKey?: string,
  ) {
    const seq = await this.prisma.eamMaintPlan.count({ where: { organizationId } });
    const row = await this.prisma.eamMaintPlan.create({
      data: {
        organizationId,
        planKey: generateEamCmmsKey('MNP', seq + 1),
        assetKey,
        name,
        planType,
        priority,
        frequencyValue,
        frequencyUnit,
        checklistKey,
      },
    });
    await this.audit.log(organizationId, 'EamMaintPlan', row.planKey, 'created', userId);
    return row;
  }

  async addActivity(organizationId: string, userId: string, planKey: string, name: string, estimatedHours: number, description?: string) {
    const seq = await this.prisma.eamMaintPlanActivity.count({ where: { organizationId } });
    const row = await this.prisma.eamMaintPlanActivity.create({
      data: {
        organizationId,
        activityKey: generateEamCmmsKey('ACT', seq + 1),
        planKey,
        name,
        estimatedHours,
        description,
      },
    });
    await this.audit.log(organizationId, 'EamMaintPlanActivity', row.activityKey, 'created', userId);
    return row;
  }

  async createChecklist(organizationId: string, userId: string, name: string, items: string[]) {
    const seq = await this.prisma.eamMaintChecklist.count({ where: { organizationId } });
    const checklistKey = generateEamCmmsKey('CHK', seq + 1);
    await this.prisma.eamMaintChecklist.create({
      data: { organizationId, checklistKey, name },
    });
    for (let i = 0; i < items.length; i++) {
      const iSeq = await this.prisma.eamMaintChecklistItem.count({ where: { organizationId } });
      await this.prisma.eamMaintChecklistItem.create({
        data: {
          organizationId,
          itemKey: generateEamCmmsKey('ITM', iSeq + 1),
          checklistKey,
          label: items[i],
          sortOrder: i,
        },
      });
    }
    await this.audit.log(organizationId, 'EamMaintChecklist', checklistKey, 'created', userId);
    return this.prisma.eamMaintChecklist.findFirst({
      where: { organizationId, checklistKey },
      include: { items: true },
    });
  }

  listChecklists(organizationId: string) {
    return this.prisma.eamMaintChecklist.findMany({
      where: { organizationId, isActive: true },
      include: { items: true },
    });
  }
}
