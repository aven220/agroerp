import { Injectable } from '@nestjs/common';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { generateEphpKey } from '../domain/ephp.engine';
import { EphpAuditService } from './ephp-audit.service';

@Injectable()
export class EphpMonitoringService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly audit: EphpAuditService,
  ) {}

  list(organizationId: string, fieldLotId?: string) {
    return this.prisma.ephpFieldMonitoring.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      orderBy: { monitoredAt: 'desc' },
      take: 200,
    });
  }

  async record(
    organizationId: string,
    userId: string,
    data: {
      fieldLotId?: string; monitoringType?: string; latitude?: number; longitude?: number;
      severityScale?: number; photoRefs?: string[]; videoRefs?: string[];
      observations?: string; findings?: unknown[];
    },
  ) {
    const count = await this.prisma.ephpFieldMonitoring.count({ where: { organizationId } });
    const monitoringKey = generateEphpKey('MON', count + 1);
    const row = await this.prisma.ephpFieldMonitoring.create({
      data: {
        organizationId, monitoringKey, fieldLotId: data.fieldLotId,
        monitoringType: data.monitoringType ?? 'inspection',
        latitude: data.latitude, longitude: data.longitude, severityScale: data.severityScale,
        photoRefs: data.photoRefs ?? [], videoRefs: data.videoRefs ?? [],
        observations: data.observations, findings: (data.findings ?? []) as object,
        recordedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EphpFieldMonitoring', monitoringKey, 'monitoring_recorded', userId);
    return row;
  }
}
