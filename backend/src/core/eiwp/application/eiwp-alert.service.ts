import { Injectable } from '@nestjs/common';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { EIWP_ALERT_TYPES, evaluateClimateAlerts, generateEiwpKey } from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';

@Injectable()
export class EiwpAlertService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
  ) {}

  alertTypes() {
    return EIWP_ALERT_TYPES;
  }

  listActive(organizationId: string) {
    return this.prisma.eiwpAlert.findMany({
      where: { organizationId, isActive: true },
      orderBy: { triggeredAt: 'desc' },
      take: 200,
    });
  }

  listAll(organizationId: string, limit = 200) {
    return this.prisma.eiwpAlert.findMany({
      where: { organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }

  async generateFromClimate(
    organizationId: string,
    userId: string | undefined,
    input: Parameters<typeof evaluateClimateAlerts>[0] & { fieldLotId?: string; sectorId?: string },
  ) {
    const candidates = evaluateClimateAlerts(input);
    const created = [];
    for (const c of candidates) {
      const existing = await this.prisma.eiwpAlert.findFirst({
        where: { organizationId, alertType: c.alertType, isActive: true, fieldLotId: input.fieldLotId ?? null },
      });
      if (existing) {
        created.push(existing);
        continue;
      }
      const count = await this.prisma.eiwpAlert.count({ where: { organizationId } });
      const alertKey = generateEiwpKey('ALT', count + 1);
      const row = await this.prisma.eiwpAlert.create({
        data: {
          organizationId,
          alertKey,
          alertType: c.alertType,
          severity: c.severity,
          fieldLotId: input.fieldLotId,
          sectorId: input.sectorId,
          title: c.title,
          message: c.title,
        },
      });
      await this.audit.log(organizationId, 'EiwpAlert', alertKey, 'alert_generated', userId, { alertType: c.alertType });
      created.push(row);
    }
    return created;
  }

  async resolve(organizationId: string, alertKey: string) {
    const row = await this.prisma.eiwpAlert.findFirst({ where: { organizationId, alertKey } });
    if (!row) return { resolved: false };
    await this.prisma.eiwpAlert.update({
      where: { id: row.id },
      data: { isActive: false, resolvedAt: new Date() },
    });
    return { resolved: true, alertKey };
  }
}
