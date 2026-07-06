import { Injectable } from '@nestjs/common';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { evaluatePhytosanitaryAlerts, generateEphpKey } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';

@Injectable()
export class EphpAlertService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  listActive(organizationId: string) {
    return this.prisma.ephpAlert.findMany({
      where: { organizationId, isActive: true },
      orderBy: { triggeredAt: 'desc' },
      take: 200,
    });
  }

  listAll(organizationId: string) {
    return this.prisma.ephpAlert.findMany({
      where: { organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: 200,
    });
  }

  async generate(organizationId: string, userId: string | undefined, input: Parameters<typeof evaluatePhytosanitaryAlerts>[0] & { fieldLotId?: string }) {
    const candidates = evaluatePhytosanitaryAlerts(input);
    const created = [];
    for (const c of candidates) {
      const existing = await this.prisma.ephpAlert.findFirst({
        where: { organizationId, alertType: c.alertType, isActive: true, fieldLotId: input.fieldLotId ?? null },
      });
      if (existing) { created.push(existing); continue; }
      const count = await this.prisma.ephpAlert.count({ where: { organizationId } });
      const alertKey = generateEphpKey('ALT', count + 1);
      const row = await this.prisma.ephpAlert.create({
        data: {
          organizationId, alertKey, alertType: c.alertType,
          severity: c.severity as never, fieldLotId: input.fieldLotId,
          title: c.title, message: c.title,
        },
      });
      created.push(row);
    }
    return created;
  }

  async resolve(organizationId: string, alertKey: string) {
    const row = await this.prisma.ephpAlert.findFirst({ where: { organizationId, alertKey } });
    if (!row) return { resolved: false };
    await this.prisma.ephpAlert.update({ where: { id: row.id }, data: { isActive: false } });
    return { resolved: true };
  }
}
