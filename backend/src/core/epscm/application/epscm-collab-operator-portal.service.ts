import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabOperatorPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmCollabIntegrationService,
  ) {}

  async portal(organizationId: string, partnerKey: string) {
    const assignments = await this.prisma.epscmCollabOperatorAssignment.findMany({
      where: { organizationId, partnerKey },
      orderBy: { assignedAt: 'desc' },
    });
    const tripKeys = assignments.map((a) => a.tripKey);
    const [trips, deliveries] = await Promise.all([
      this.prisma.epscmTmsTrip.findMany({ where: { organizationId, tripKey: { in: tripKeys } } }),
      this.prisma.epscmTmsDelivery.findMany({ where: { organizationId, tripKey: { in: tripKeys } } }),
    ]);
    return { assignments, trips, deliveries };
  }

  async syncFromTms(organizationId: string, userId: string, partnerKey: string) {
    const trips = await this.prisma.epscmTmsTrip.findMany({
      where: { organizationId, status: { in: ['scheduled', 'assigned', 'in_progress'] } },
      take: 30,
    });
    for (const trip of trips) {
      const existing = await this.prisma.epscmCollabOperatorAssignment.findFirst({
        where: { organizationId, partnerKey, tripKey: trip.tripKey },
      });
      if (existing) continue;
      const seq = await this.prisma.epscmCollabOperatorAssignment.count({ where: { organizationId } });
      await this.prisma.epscmCollabOperatorAssignment.create({
        data: {
          organizationId,
          assignmentKey: generateEpscmCollabKey('ASG', seq + 1),
          partnerKey,
          tripKey: trip.tripKey,
        },
      });
    }
    await this.audit.log(organizationId, 'EpscmCollabOperatorAssignment', partnerKey, 'collab_access', userId);
    return this.portal(organizationId, partnerKey);
  }

  async confirmReception(organizationId: string, userId: string, assignmentKey: string) {
    const assignment = await this.getAssignment(organizationId, assignmentKey);
    return this.recordUpdate(organizationId, userId, assignmentKey, 'received', 'Recepción confirmada');
  }

  async updateStatus(organizationId: string, userId: string, assignmentKey: string, status: string, notes?: string) {
    const assignment = await this.getAssignment(organizationId, assignmentKey);
    await this.prisma.epscmCollabOperatorAssignment.update({
      where: { id: assignment.id },
      data: { status },
    });
    return this.recordUpdate(organizationId, userId, assignmentKey, status, notes);
  }

  async attachEvidence(organizationId: string, userId: string, assignmentKey: string, evidenceType: string, storageUrl: string) {
    await this.getAssignment(organizationId, assignmentKey);
    const seq = await this.prisma.epscmCollabOperatorEvidence.count({ where: { organizationId } });
    const evidence = await this.prisma.epscmCollabOperatorEvidence.create({
      data: {
        organizationId,
        evidenceKey: generateEpscmCollabKey('EVD', seq + 1),
        assignmentKey,
        evidenceType,
        storageUrl,
        capturedBy: userId,
      },
    });
    await this.integration.onDocumentUploaded(organizationId, evidence.evidenceKey, evidenceType);
    await this.audit.log(organizationId, 'EpscmCollabOperatorEvidence', evidence.evidenceKey, 'collab_document_uploaded', userId);
    return evidence;
  }

  async recordReturn(organizationId: string, userId: string, deliveryKey: string, notes?: string) {
    const delivery = await this.prisma.epscmTmsDelivery.findFirst({ where: { organizationId, deliveryKey } });
    if (!delivery) throw new NotFoundException('Delivery not found');
    await this.prisma.epscmTmsDelivery.update({
      where: { id: delivery.id },
      data: { status: 'returned', issueNotes: notes },
    });
    return delivery;
  }

  private async getAssignment(organizationId: string, assignmentKey: string) {
    const a = await this.prisma.epscmCollabOperatorAssignment.findFirst({ where: { organizationId, assignmentKey } });
    if (!a) throw new NotFoundException('Assignment not found');
    return a;
  }

  private async recordUpdate(organizationId: string, userId: string, assignmentKey: string, status: string, notes?: string) {
    const seq = await this.prisma.epscmCollabOperatorUpdate.count({ where: { organizationId } });
    return this.prisma.epscmCollabOperatorUpdate.create({
      data: {
        organizationId,
        updateKey: generateEpscmCollabKey('UPD', seq + 1),
        assignmentKey,
        status,
        notes,
        updatedBy: userId,
      },
    });
  }
}
