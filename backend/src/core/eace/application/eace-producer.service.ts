import { Injectable } from '@nestjs/common';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { generateEaceKey } from '../domain/eace.engine';
import { EaceAuditService } from './eace-audit.service';
import { EaceNotificationService } from './eace-notification.service';

@Injectable()
export class EaceProducerService {
  constructor(
    private readonly prisma: EacePrismaService,
    private readonly audit: EaceAuditService,
    private readonly notifications: EaceNotificationService,
  ) {}

  async listProfiles(organizationId: string) {
    return this.prisma.eaceProducerProfile.findMany({
      where: { organizationId },
      include: { farms: true, documents: { take: 5 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getProfile(organizationId: string, profileKey: string) {
    return this.prisma.eaceProducerProfile.findFirst({
      where: { organizationId, profileKey },
      include: { farms: true, documents: true, history: { orderBy: { recordedAt: 'desc' }, take: 50 } },
    });
  }

  async registerProfile(organizationId: string, userId: string, data: {
    producerRef: string; displayName: string; contactEmail?: string; contactPhone?: string; region?: string;
  }) {
    const count = await this.prisma.eaceProducerProfile.count({ where: { organizationId } });
    const profile = await this.prisma.eaceProducerProfile.create({
      data: {
        organizationId,
        profileKey: generateEaceKey('PRD', count + 1),
        producerRef: data.producerRef,
        displayName: data.displayName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        region: data.region,
      },
    });
    await this.audit.log(organizationId, 'ProducerProfile', profile.profileKey, 'producer_registered', userId);
    await this.notifications.send(organizationId, data.producerRef, 'Perfil registrado', `Perfil ${data.displayName} activo`);
    return profile;
  }

  async authorizeFarm(organizationId: string, profileKey: string, data: {
    farmRef: string; farmName?: string; crops?: unknown[]; campaigns?: unknown[];
  }) {
    const profile = await this.prisma.eaceProducerProfile.findFirst({ where: { organizationId, profileKey } });
    if (!profile) return null;
    const count = await this.prisma.eaceProducerFarmAuth.count({ where: { organizationId } });
    return this.prisma.eaceProducerFarmAuth.create({
      data: {
        organizationId,
        farmAuthKey: generateEaceKey('FRM', count + 1),
        profileId: profile.id,
        farmRef: data.farmRef,
        farmName: data.farmName,
        crops: (data.crops ?? []) as object,
        campaigns: (data.campaigns ?? []) as object,
      },
    });
  }

  async linkDocument(organizationId: string, profileKey: string, data: {
    docType: string; title: string; fileRef?: string;
  }) {
    const profile = await this.prisma.eaceProducerProfile.findFirst({ where: { organizationId, profileKey } });
    if (!profile) return null;
    const count = await this.prisma.eaceProducerDocument.count({ where: { organizationId } });
    const doc = await this.prisma.eaceProducerDocument.create({
      data: {
        organizationId,
        documentKey: generateEaceKey('DOC', count + 1),
        profileId: profile.id,
        docType: data.docType,
        title: data.title,
        fileRef: data.fileRef,
      },
    });
    await this.audit.log(organizationId, 'ProducerDocument', doc.documentKey, 'document_linked');
    return doc;
  }

  async recordHistory(organizationId: string, profileKey: string, eventType: string, summary: string, payload?: Record<string, unknown>) {
    const profile = await this.prisma.eaceProducerProfile.findFirst({ where: { organizationId, profileKey } });
    if (!profile) return null;
    const count = await this.prisma.eaceProducerHistory.count({ where: { organizationId } });
    return this.prisma.eaceProducerHistory.create({
      data: {
        organizationId,
        historyKey: generateEaceKey('HIS', count + 1),
        profileId: profile.id,
        eventType,
        summary,
        payload: (payload ?? {}) as object,
      },
    });
  }

  async updateIndicators(organizationId: string, profileKey: string, indicators: Record<string, unknown>) {
    return this.prisma.eaceProducerProfile.updateMany({
      where: { organizationId, profileKey },
      data: { indicators: indicators as object },
    });
  }
}
