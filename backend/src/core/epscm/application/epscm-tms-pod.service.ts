import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';

@Injectable()
export class EpscmTmsPodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmTmsIntegrationService,
  ) {}

  list(organizationId: string, deliveryKey?: string) {
    return this.prisma.epscmTmsPod.findMany({
      where: { organizationId, ...(deliveryKey ? { deliveryKey } : {}) },
      include: { attachments: true },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async capture(
    organizationId: string,
    userId: string,
    deliveryKey: string,
    input: {
      signedBy?: string;
      signatureUrl?: string;
      photoUrl?: string;
      latitude?: number;
      longitude?: number;
      observations?: string;
    },
  ) {
    const delivery = await this.prisma.epscmTmsDelivery.findFirst({ where: { organizationId, deliveryKey } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const seq = await this.prisma.epscmTmsPod.count({ where: { organizationId } });
    const pod = await this.prisma.epscmTmsPod.create({
      data: {
        organizationId,
        podKey: generateEpscmTmsKey('POD', seq + 1),
        deliveryKey,
        signedBy: input.signedBy,
        signatureUrl: input.signatureUrl,
        photoUrl: input.photoUrl,
        latitude: input.latitude,
        longitude: input.longitude,
        observations: input.observations,
        capturedBy: userId,
      },
    });
    await this.integration.onPodCaptured(organizationId, pod.podKey, deliveryKey, delivery.orderKey);
    await this.audit.log(organizationId, 'EpscmTmsPod', pod.podKey, 'tms_pod_captured', userId);
    return pod;
  }

  async addAttachment(organizationId: string, userId: string, podKey: string, fileType: string, storageUrl: string) {
    const seq = await this.prisma.epscmTmsPodAttachment.count({ where: { organizationId } });
    const att = await this.prisma.epscmTmsPodAttachment.create({
      data: {
        organizationId,
        attachmentKey: generateEpscmTmsKey('ATT', seq + 1),
        podKey,
        fileType,
        storageUrl,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsPodAttachment', att.attachmentKey, 'created', userId);
    return this.prisma.epscmTmsPod.findFirst({
      where: { organizationId, podKey },
      include: { attachments: true },
    });
  }

  history(organizationId: string, deliveryKey: string) {
    return this.list(organizationId, deliveryKey);
  }
}
