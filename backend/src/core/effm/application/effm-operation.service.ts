import { Injectable, NotFoundException } from '@nestjs/common';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';
import { computeOperationMetrics, generateEffmKey } from '../domain/effm.engine';
import { EffmAuditService } from './effm-audit.service';

@Injectable()
export class EffmOperationService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly audit: EffmAuditService,
  ) {}

  listSessions(organizationId: string, fieldLotId?: string) {
    return this.prisma.effmOperationSession.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { machine: true, assignment: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async startOperation(
    organizationId: string,
    userId: string,
    data: { machineId: string; assignmentId?: string; laborTaskRef?: string; fieldLotId?: string; cropCode?: string },
  ) {
    const count = await this.prisma.effmOperationSession.count({ where: { organizationId } });
    const sessionKey = generateEffmKey('OPS', count + 1);
    const row = await this.prisma.effmOperationSession.create({
      data: { organizationId, sessionKey, ...data, status: 'in_progress' },
    });
    await this.prisma.effmMachine.update({ where: { id: data.machineId }, data: { status: 'in_use' } });
    await this.audit.log(organizationId, 'EffmOperationSession', sessionKey, 'operation_started', userId);
    return row;
  }

  async endOperation(
    organizationId: string,
    userId: string,
    sessionKey: string,
    data?: { distanceKm?: number; areaCoveredHa?: number; idleMinutes?: number; unproductiveMinutes?: number },
  ) {
    const session = await this.prisma.effmOperationSession.findFirst({ where: { organizationId, sessionKey } });
    if (!session) throw new NotFoundException('Operation session not found');
    const endedAt = new Date();
    const metrics = computeOperationMetrics({
      startedAt: session.startedAt, endedAt,
      distanceKm: data?.distanceKm, areaCoveredHa: data?.areaCoveredHa,
    });
    const updated = await this.prisma.effmOperationSession.update({
      where: { id: session.id },
      data: {
        endedAt, status: 'completed',
        hoursWorked: metrics.hoursWorked, avgSpeedKmh: metrics.avgSpeedKmh,
        distanceKm: data?.distanceKm, areaCoveredHa: data?.areaCoveredHa,
        idleMinutes: data?.idleMinutes, unproductiveMinutes: data?.unproductiveMinutes,
      },
    });
    await this.prisma.effmMachine.update({ where: { id: session.machineId }, data: { status: 'active', hourMeter: { increment: metrics.hoursWorked } } });
    await this.audit.log(organizationId, 'EffmOperationSession', sessionKey, 'operation_completed', userId, metrics as Record<string, unknown>);
    return updated;
  }
}
