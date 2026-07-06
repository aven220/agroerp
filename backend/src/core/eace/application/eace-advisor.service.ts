import { Injectable } from '@nestjs/common';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';
import { EaceNotificationService } from './eace-notification.service';

@Injectable()
export class EaceAdvisorService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
    private readonly notifications: EaceNotificationService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eaceAdvisor.findMany({
      where: { organizationId },
      include: { assignments: true, visits: { orderBy: { visitDate: 'desc' }, take: 10 } },
    });
  }

  async register(organizationId: string, data: { name: string; specialty?: string; contactEmail?: string }) {
    const count = await this.prisma.eaceAdvisor.count({ where: { organizationId } });
    return this.prisma.eaceAdvisor.create({
      data: {
        organizationId,
        advisorKey: generateEaceKey('ADV', count + 1),
        name: data.name,
        specialty: data.specialty,
        contactEmail: data.contactEmail,
      },
    });
  }

  async assignProducer(organizationId: string, advisorKey: string, data: {
    producerRef: string; fieldLotRef?: string;
  }) {
    const advisor = await this.prisma.eaceAdvisor.findFirst({ where: { organizationId, advisorKey } });
    if (!advisor) return null;
    const count = await this.prisma.eaceAdvisorAssignment.count({ where: { organizationId } });
    return this.prisma.eaceAdvisorAssignment.create({
      data: {
        organizationId,
        assignmentKey: generateEaceKey('ASN', count + 1),
        advisorId: advisor.id,
        producerRef: data.producerRef,
        fieldLotRef: data.fieldLotRef,
      },
    });
  }

  listVisits(organizationId: string, advisorKey?: string) {
    return this.prisma.eaceTechnicalVisit.findMany({
      where: {
        organizationId,
        ...(advisorKey ? { advisor: { advisorKey } } : {}),
      },
      include: { advisor: true },
      orderBy: { visitDate: 'desc' },
    });
  }

  async scheduleVisit(organizationId: string, userId: string, advisorKey: string, data: {
    producerRef: string; fieldLotRef?: string; visitDate: string; summary?: string;
  }) {
    const advisor = await this.prisma.eaceAdvisor.findFirst({ where: { organizationId, advisorKey } });
    if (!advisor) return null;
    const count = await this.prisma.eaceTechnicalVisit.count({ where: { organizationId } });
    const visit = await this.prisma.eaceTechnicalVisit.create({
      data: {
        organizationId,
        visitKey: generateEaceKey('VST', count + 1),
        advisorId: advisor.id,
        producerRef: data.producerRef,
        fieldLotRef: data.fieldLotRef,
        visitDate: new Date(data.visitDate),
        summary: data.summary,
        status: 'scheduled',
      },
    });
    await this.audit.log(organizationId, 'TechnicalVisit', visit.visitKey, 'visit_recorded', userId);
    await this.notifications.send(organizationId, data.producerRef, 'Visita técnica programada', data.summary ?? visit.visitKey);
    return visit;
  }

  async completeVisit(organizationId: string, userId: string, visitKey: string, data: {
    summary?: string; recommendations?: unknown[]; observations?: unknown[]; photos?: unknown[]; report?: Record<string, unknown>;
  }) {
    const visit = await this.prisma.eaceTechnicalVisit.findFirst({ where: { organizationId, visitKey } });
    if (!visit) return null;
    const updated = await this.prisma.eaceTechnicalVisit.update({
      where: { id: visit.id },
      data: {
        status: 'completed',
        summary: data.summary ?? visit.summary,
        recommendations: (data.recommendations ?? []) as object,
        observations: (data.observations ?? []) as object,
        photos: (data.photos ?? []) as object,
        report: (data.report ?? {}) as object,
      },
    });
    if ((data.recommendations?.length ?? 0) > 0) {
      await this.audit.log(organizationId, 'TechnicalVisit', visitKey, 'recommendation_issued', userId);
    }
    return updated;
  }
}
