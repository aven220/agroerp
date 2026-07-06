import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamCmmsKey, selectTechnicianForAssignment } from '../domain/eam-cmms.engine';
import { EamMaintPriority } from '@prisma/client';
import { EamAuditService } from './eam-audit.service';

@Injectable()
export class EamTechnicianService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eamTechnician.findMany({ where: { organizationId } });
  }

  listCrews(organizationId: string) {
    return this.prisma.eamCrew.findMany({
      where: { organizationId, isActive: true },
      include: { members: true },
    });
  }

  listSpecialties(organizationId: string) {
    return this.prisma.eamTechnicianSpecialty.findMany({ where: { organizationId } });
  }

  async createSpecialty(organizationId: string, userId: string, code: string, name: string) {
    const seq = await this.prisma.eamTechnicianSpecialty.count({ where: { organizationId } });
    return this.prisma.eamTechnicianSpecialty.create({
      data: { organizationId, specialtyKey: generateEamCmmsKey('SPC', seq + 1), code, name },
    });
  }

  async createTechnician(organizationId: string, userId: string, name: string, specialtyKey?: string, userIdLink?: string) {
    const seq = await this.prisma.eamTechnician.count({ where: { organizationId } });
    const row = await this.prisma.eamTechnician.create({
      data: {
        organizationId,
        technicianKey: generateEamCmmsKey('TEC', seq + 1),
        name,
        specialtyKey,
        userId: userIdLink,
      },
    });
    await this.audit.log(organizationId, 'EamTechnician', row.technicianKey, 'created', userId);
    return row;
  }

  async createCrew(organizationId: string, userId: string, code: string, name: string) {
    const seq = await this.prisma.eamCrew.count({ where: { organizationId } });
    return this.prisma.eamCrew.create({
      data: { organizationId, crewKey: generateEamCmmsKey('CRW', seq + 1), code, name },
    });
  }

  async addCrewMember(organizationId: string, crewKey: string, technicianKey: string, role = 'member') {
    const seq = await this.prisma.eamCrewMember.count({ where: { organizationId } });
    return this.prisma.eamCrewMember.create({
      data: { organizationId, memberKey: generateEamCmmsKey('MBR', seq + 1), crewKey, technicianKey, role },
    });
  }

  async addShift(organizationId: string, technicianKey: string, shiftStart: Date, shiftEnd: Date) {
    const seq = await this.prisma.eamTechnicianShift.count({ where: { organizationId } });
    return this.prisma.eamTechnicianShift.create({
      data: { organizationId, shiftKey: generateEamCmmsKey('SHF', seq + 1), technicianKey, shiftStart, shiftEnd },
    });
  }

  workload(organizationId: string) {
    return this.prisma.eamTechnician.findMany({
      where: { organizationId },
      include: { assignments: true, shifts: { where: { shiftEnd: { gte: new Date() } } } },
    });
  }

  async autoAssign(organizationId: string, userId: string, workOrderKey: string, priority: EamMaintPriority) {
    const technicians = await this.prisma.eamTechnician.findMany({ where: { organizationId } });
    const workloads = technicians.map((t) => ({
      technicianKey: t.technicianKey,
      hours: t.workloadHours,
      isAvailable: t.isAvailable,
    }));
    const selected = selectTechnicianForAssignment(workloads, priority);
    if (!selected) return null;
    const seq = await this.prisma.eamWorkOrderAssignment.count({ where: { organizationId } });
    const row = await this.prisma.eamWorkOrderAssignment.create({
      data: {
        organizationId,
        assignmentKey: generateEamCmmsKey('ASG', seq + 1),
        workOrderKey,
        technicianKey: selected,
        isPrimary: true,
      },
    });
    await this.prisma.eamTechnician.updateMany({
      where: { organizationId, technicianKey: selected },
      data: { workloadHours: { increment: 1 } },
    });
    await this.audit.log(organizationId, 'EamWorkOrderAssignment', row.assignmentKey, 'assignment_changed', userId);
    return row;
  }

  async assign(organizationId: string, userId: string, workOrderKey: string, technicianKey: string, isPrimary = true) {
    const seq = await this.prisma.eamWorkOrderAssignment.count({ where: { organizationId } });
    const row = await this.prisma.eamWorkOrderAssignment.create({
      data: { organizationId, assignmentKey: generateEamCmmsKey('ASG', seq + 1), workOrderKey, technicianKey, isPrimary },
    });
    await this.audit.log(organizationId, 'EamWorkOrderAssignment', row.assignmentKey, 'assignment_changed', userId);
    return row;
  }
}
