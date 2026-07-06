import { Injectable, NotFoundException } from '@nestjs/common';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';
import { EFFM_COUPLING_ACTIONS, EFFM_MACHINE_TYPES, generateEffmKey } from '../domain/effm.engine';
import { EffmAuditService } from './effm-audit.service';

@Injectable()
export class EffmMachineService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly audit: EffmAuditService,
  ) {}

  listMachines(organizationId: string, machineType?: string) {
    return this.prisma.effmMachine.findMany({
      where: { organizationId, ...(machineType ? { machineType } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async registerMachine(
    organizationId: string,
    userId: string,
    data: { machineType: string; code: string; name: string; brand?: string; model?: string; serialNumber?: string; qrCode?: string },
  ) {
    const count = await this.prisma.effmMachine.count({ where: { organizationId } });
    const machineKey = generateEffmKey('MCH', count + 1);
    const row = await this.prisma.effmMachine.create({
      data: { organizationId, machineKey, ...data, qrCode: data.qrCode ?? machineKey },
    });
    await this.audit.log(organizationId, 'EffmMachine', machineKey, 'machine_registered', userId);
    return row;
  }

  async findByQr(organizationId: string, qrCode: string) {
    return this.prisma.effmMachine.findFirst({ where: { organizationId, qrCode } });
  }

  listAssignments(organizationId: string) {
    return this.prisma.effmOperatorAssignment.findMany({
      where: { organizationId, status: 'active' },
      include: { machine: true },
    });
  }

  async assignOperator(
    organizationId: string,
    userId: string,
    data: { employeeRef: string; machineId?: string; shiftRef?: string; licenseType?: string; certRef?: string },
  ) {
    const count = await this.prisma.effmOperatorAssignment.count({ where: { organizationId } });
    const assignmentKey = generateEffmKey('OPR', count + 1);
    const row = await this.prisma.effmOperatorAssignment.create({
      data: { organizationId, assignmentKey, ...data },
    });
    await this.audit.log(organizationId, 'EffmOperatorAssignment', assignmentKey, 'operator_assigned', userId);
    return row;
  }

  async recordIncident(
    organizationId: string,
    userId: string,
    data: { incidentType: string; description: string; machineId?: string; photoRefs?: string[] },
  ) {
    const count = await this.prisma.effmIncident.count({ where: { organizationId } });
    const incidentKey = generateEffmKey('INC', count + 1);
    const row = await this.prisma.effmIncident.create({
      data: { organizationId, incidentKey, ...data, reportedBy: userId, photoRefs: data.photoRefs ?? [] },
    });
    await this.audit.log(organizationId, 'EffmIncident', incidentKey, 'incident_recorded', userId);
    return row;
  }

  listIncidents(organizationId: string) {
    return this.prisma.effmIncident.findMany({ where: { organizationId }, orderBy: { reportedAt: 'desc' } });
  }

  machineTypes() { return EFFM_MACHINE_TYPES; }
  couplingActions() { return EFFM_COUPLING_ACTIONS; }
}

@Injectable()
export class EffmImplementService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly audit: EffmAuditService,
  ) {}

  listImplements(organizationId: string) {
    return this.prisma.effmImplement.findMany({
      where: { organizationId },
      include: { compatibilities: true },
    });
  }

  async registerImplement(
    organizationId: string,
    userId: string,
    data: { implementType: string; code: string; name: string; compatibleMachineTypes?: string[] },
  ) {
    const count = await this.prisma.effmImplement.count({ where: { organizationId } });
    const implementKey = generateEffmKey('IMP', count + 1);
    const row = await this.prisma.effmImplement.create({
      data: { organizationId, implementKey, implementType: data.implementType, code: data.code, name: data.name },
    });
    for (const machineType of data.compatibleMachineTypes ?? []) {
      await this.prisma.effmImplementCompatibility.create({
        data: { organizationId, implementId: row.id, machineType },
      });
    }
    await this.audit.log(organizationId, 'EffmImplement', implementKey, 'implement_registered', userId);
    return this.prisma.effmImplement.findUnique({ where: { id: row.id }, include: { compatibilities: true } });
  }

  async coupling(
    organizationId: string,
    userId: string,
    data: { machineId: string; implementId: string; action: string },
  ) {
    const count = await this.prisma.effmCoupling.count({ where: { organizationId } });
    const couplingKey = generateEffmKey('CPL', count + 1);
    const row = await this.prisma.effmCoupling.create({
      data: { organizationId, couplingKey, ...data, performedBy: userId },
    });
    const implementStatus = data.action === 'attach' ? 'in_use' : 'active';
    await this.prisma.effmImplement.update({ where: { id: data.implementId }, data: { status: implementStatus as never } });
    await this.audit.log(organizationId, 'EffmCoupling', couplingKey, data.action === 'attach' ? 'coupling_attached' : 'coupling_detached', userId);
    return row;
  }

  listCouplingHistory(organizationId: string) {
    return this.prisma.effmCoupling.findMany({
      where: { organizationId },
      include: { machine: true, implement: true },
      orderBy: { performedAt: 'desc' },
      take: 100,
    });
  }
}
