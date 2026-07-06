import { Injectable, NotFoundException } from '@nestjs/common';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { computeIntervalAlerts, generateEphpKey, validateMrl } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';

@Injectable()
export class EphpIntervalService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  listRules(organizationId: string) {
    return this.prisma.ephpIntervalRule.findMany({ where: { organizationId, status: 'active' } });
  }

  async registerRule(
    organizationId: string,
    data: {
      productName: string; activeIngredient?: string; preHarvestDays?: number;
      reEntryHours?: number; harvestBlocked?: boolean; accessBlocked?: boolean;
    },
  ) {
    const count = await this.prisma.ephpIntervalRule.count({ where: { organizationId } });
    const ruleKey = generateEphpKey('INT', count + 1);
    return this.prisma.ephpIntervalRule.create({
      data: {
        organizationId, ruleKey, productName: data.productName, activeIngredient: data.activeIngredient,
        preHarvestDays: data.preHarvestDays ?? 0, reEntryHours: data.reEntryHours ?? 0,
        harvestBlocked: data.harvestBlocked ?? false, accessBlocked: data.accessBlocked ?? false,
      },
    });
  }

  listAlerts(organizationId: string) {
    return this.prisma.ephpIntervalAlert.findMany({
      where: { organizationId, isActive: true },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async generateFromApplication(
    organizationId: string,
    userId: string | undefined,
    data: { applicationId: string; fieldLotId?: string; productName: string; appliedAt: Date },
  ) {
    const rule = await this.prisma.ephpIntervalRule.findFirst({
      where: { organizationId, productName: data.productName, status: 'active' },
    });
    if (!rule) return [];
    const candidates = computeIntervalAlerts({
      appliedAt: data.appliedAt,
      preHarvestDays: rule.preHarvestDays,
      reEntryHours: rule.reEntryHours,
      harvestBlocked: rule.harvestBlocked,
      accessBlocked: rule.accessBlocked,
    });
    const created = [];
    for (const c of candidates) {
      const count = await this.prisma.ephpIntervalAlert.count({ where: { organizationId } });
      const alertKey = generateEphpKey('IAL', count + 1);
      const row = await this.prisma.ephpIntervalAlert.create({
        data: {
          organizationId, alertKey, fieldLotId: data.fieldLotId, applicationId: data.applicationId,
          alertType: c.alertType, expiresAt: c.expiresAt, isActive: c.active,
        },
      });
      await this.audit.log(organizationId, 'EphpIntervalAlert', alertKey, 'interval_alert', userId);
      created.push(row);
    }
    return created;
  }
}

@Injectable()
export class EphpMrlService {
  constructor(private readonly prisma: EphpPrismaService) {}

  list(organizationId: string, countryCode?: string) {
    return this.prisma.ephpMrlRegulation.findMany({
      where: { organizationId, status: 'active', ...(countryCode ? { countryCode } : {}) },
    });
  }

  async register(
    organizationId: string,
    data: {
      countryCode: string; marketType?: string; activeIngredient: string;
      cropCode?: string; maxResiduePpm: number;
    },
  ) {
    const count = await this.prisma.ephpMrlRegulation.count({ where: { organizationId } });
    const regulationKey = generateEphpKey('MRL', count + 1);
    return this.prisma.ephpMrlRegulation.create({
      data: {
        organizationId, regulationKey, countryCode: data.countryCode,
        marketType: data.marketType ?? 'export', activeIngredient: data.activeIngredient,
        cropCode: data.cropCode, maxResiduePpm: data.maxResiduePpm,
      },
    });
  }

  async validate(
    organizationId: string,
    data: { activeIngredient: string; cropCode?: string; countryCode: string; residuePpm: number },
  ) {
    const reg = await this.prisma.ephpMrlRegulation.findFirst({
      where: {
        organizationId, activeIngredient: data.activeIngredient,
        countryCode: data.countryCode, status: 'active',
        ...(data.cropCode ? { cropCode: data.cropCode } : {}),
      },
    });
    const limit = reg?.maxResiduePpm ?? 999;
    return validateMrl(data.activeIngredient, data.residuePpm, limit);
  }
}

@Injectable()
export class EphpComplianceService {
  constructor(private readonly prisma: EphpPrismaService) {}

  listFrameworks(organizationId: string) {
    return this.prisma.ephpComplianceFramework.findMany({
      where: { organizationId, status: 'active' },
      include: { checklists: true },
    });
  }

  async registerFramework(
    organizationId: string,
    data: { name: string; frameworkType: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.ephpComplianceFramework.count({ where: { organizationId } });
    const frameworkKey = generateEphpKey('CMP', count + 1);
    return this.prisma.ephpComplianceFramework.create({
      data: {
        organizationId, frameworkKey, name: data.name, frameworkType: data.frameworkType,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  async upsertChecklist(
    organizationId: string,
    data: { frameworkKey: string; title: string; items: unknown[]; completedPct?: number },
  ) {
    const fw = await this.prisma.ephpComplianceFramework.findFirst({
      where: { organizationId, frameworkKey: data.frameworkKey },
    });
    if (!fw) throw new NotFoundException('Marco normativo no encontrado');
    const count = await this.prisma.ephpComplianceChecklist.count({ where: { organizationId } });
    const checklistKey = generateEphpKey('CHK', count + 1);
    return this.prisma.ephpComplianceChecklist.create({
      data: {
        organizationId, checklistKey, frameworkId: fw.id, title: data.title,
        items: data.items as object, completedPct: data.completedPct ?? 0,
      },
    });
  }
}
