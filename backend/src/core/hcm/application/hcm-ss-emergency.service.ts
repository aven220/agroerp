import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { HcmAuditService } from './hcm-audit.service';
import { generateSsKey } from '../domain/hcm-sst.engine';
import type { HcmSsBrigadeRole } from '@prisma/client';

@Injectable()
export class HcmSsEmergencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: HcmAuditService,
  ) {}

  listPlans(organizationId: string) {
    return this.prisma.hcmSsEmergencyPlan.findMany({
      where: { organizationId },
      include: { brigades: true, drills: true, equipments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async seedDefaults(organizationId: string, userId: string) {
    const planKey = generateSsKey('EMG', 1);
    await this.prisma.hcmSsEmergencyPlan.create({
      data: {
        organizationId, planKey, name: 'Plan de emergencias sede principal',
        protocols: [
          { code: 'EVAC', name: 'Evacuación general' },
          { code: 'FIRE', name: 'Incendio' },
          { code: 'MED', name: 'Emergencia médica' },
        ],
        meetingPoints: [{ name: 'Punto de encuentro principal', location: 'Parqueadero' }],
        schedule: [{ activity: 'Simulacro semestral', month: 6 }],
        createdBy: userId,
      },
    });
    await this.prisma.hcmSsEmergencyEquipment.create({
      data: {
        organizationId, equipmentKey: generateSsKey('EEQ', 1), planKey,
        name: 'Extintor CO2', location: 'Pasillo A', quantity: 4,
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });
    await this.audit.log(organizationId, 'HcmSsEmergencyPlan', planKey, 'seeded', userId);
  }

  async createPlan(organizationId: string, userId: string, input: {
    name: string; workCenterKey?: string; protocols?: unknown[];
    meetingPoints?: unknown[]; schedule?: unknown[];
  }) {
    const planKey = generateSsKey('EMG', (await this.prisma.hcmSsEmergencyPlan.count({ where: { organizationId } })) + 1);
    const plan = await this.prisma.hcmSsEmergencyPlan.create({
      data: {
        organizationId, planKey, name: input.name, workCenterKey: input.workCenterKey,
        protocols: (input.protocols ?? []) as object[],
        meetingPoints: (input.meetingPoints ?? []) as object[],
        schedule: (input.schedule ?? []) as object[],
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'HcmSsEmergencyPlan', planKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'HcmSsEmergencyPlan', planKey, EVENT_TYPES.HCM_SS_EMERGENCY_PLAN_CREATED, input);
    return plan;
  }

  async addBrigadeMember(organizationId: string, input: {
    planKey: string; employeeKey: string; role: HcmSsBrigadeRole;
  }) {
    const brigadeKey = generateSsKey('BRG', (await this.prisma.hcmSsBrigade.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsBrigade.create({
      data: {
        organizationId, brigadeKey, planKey: input.planKey,
        employeeKey: input.employeeKey, role: input.role,
      },
    });
  }

  async scheduleDrill(organizationId: string, userId: string, input: {
    planKey: string; title: string; scheduledAt: string;
  }) {
    const drillKey = generateSsKey('DRL', (await this.prisma.hcmSsDrill.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsDrill.create({
      data: {
        organizationId, drillKey, planKey: input.planKey,
        title: input.title, scheduledAt: new Date(input.scheduledAt), createdBy: userId,
      },
    });
  }

  async completeDrill(organizationId: string, drillKey: string, userId: string, input: {
    participants?: number; resultNotes?: string;
  }) {
    const drill = await this.prisma.hcmSsDrill.findFirst({ where: { organizationId, drillKey } });
    if (!drill) throw new NotFoundException('Simulacro no encontrado');
    const updated = await this.prisma.hcmSsDrill.update({
      where: { id: drill.id },
      data: {
        completedAt: new Date(),
        participants: input.participants ?? 0,
        resultNotes: input.resultNotes,
      },
    });
    await this.audit.log(organizationId, 'HcmSsDrill', drillKey, 'completed', userId);
    return updated;
  }

  async addEquipment(organizationId: string, input: {
    planKey: string; name: string; location?: string; quantity?: number; expiresAt?: string;
  }) {
    const equipmentKey = generateSsKey('EEQ', (await this.prisma.hcmSsEmergencyEquipment.count({ where: { organizationId } })) + 1);
    return this.prisma.hcmSsEmergencyEquipment.create({
      data: {
        organizationId, equipmentKey, planKey: input.planKey, name: input.name,
        location: input.location, quantity: input.quantity ?? 1,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  }
}
