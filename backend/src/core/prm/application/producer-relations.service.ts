import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { ProducersService } from './producers.service';
import {
  CreateAddressDto,
  CreateAssignmentDto,
  CreateCertificationDto,
  CreateCommunicationDto,
  CreateContactDto,
  CreateDocumentDto,
  CreateNoteDto,
  LinkFarmDto,
  MergeProducersDto,
  UpdateContactDto,
} from '../presentation/producers.dto';

@Injectable()
export class ProducerRelationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly producers: ProducersService,
  ) {}

  async addContact(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateContactDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    if (dto.isPrimary) {
      await this.prisma.producerContact.updateMany({
        where: { producerId, organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const contact = await this.prisma.producerContact.create({
      data: {
        organizationId,
        producerId,
        contactTypeCode: dto.contactTypeCode,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        isPrimary: dto.isPrimary ?? false,
        notes: dto.notes,
        externalId: dto.externalId,
        createdBy: userId,
      },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return contact;
  }

  async updateContact(
    organizationId: string,
    producerId: string,
    contactId: string,
    userId: string,
    dto: UpdateContactDto,
    ctx?: RequestContext,
  ) {
    const contact = await this.prisma.producerContact.findFirst({
      where: { id: contactId, producerId, organizationId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    if (dto.isPrimary) {
      await this.prisma.producerContact.updateMany({
        where: { producerId, organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const updated = await this.prisma.producerContact.update({
      where: { id: contactId },
      data: {
        contactTypeCode: dto.contactTypeCode,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        isPrimary: dto.isPrimary ?? contact.isPrimary,
        notes: dto.notes,
        version: { increment: 1 },
      },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return updated;
  }

  async addAddress(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateAddressDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    if (dto.isPrimary) {
      await this.prisma.producerAddress.updateMany({
        where: { producerId, organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const address = await this.prisma.producerAddress.create({
      data: {
        organizationId,
        producerId,
        addressTypeCode: dto.addressTypeCode,
        line1: dto.line1,
        line2: dto.line2,
        municipalityCode: dto.municipalityCode,
        veredaCode: dto.veredaCode,
        departmentCode: dto.departmentCode,
        countryCode: dto.countryCode ?? 'CO',
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        gpsAccuracyM: dto.gpsAccuracyM,
        isPrimary: dto.isPrimary ?? false,
        externalId: dto.externalId,
        createdBy: userId,
      },
    });
    if (dto.municipalityCode) {
      await this.prisma.producer.update({
        where: { id: producerId },
        data: {
          municipalityCode: dto.municipalityCode,
          veredaCode: dto.veredaCode,
          ...(dto.latitude != null ? { latitude: dto.latitude } : {}),
          ...(dto.longitude != null ? { longitude: dto.longitude } : {}),
        },
      });
    }
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return address;
  }

  async addCertification(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateCertificationDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    const cert = await this.prisma.producerCertification.create({
      data: {
        organizationId,
        producerId,
        schemeCode: dto.schemeCode,
        certificateNumber: dto.certificateNumber,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        documentContentId: dto.documentContentId,
        notes: dto.notes,
        createdBy: userId,
      },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return cert;
  }

  async addDocument(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateDocumentDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    const doc = await this.prisma.producerDocument.create({
      data: {
        organizationId,
        producerId,
        documentTypeCode: dto.documentTypeCode,
        contentId: dto.contentId,
        title: dto.title,
        description: dto.description,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return doc;
  }

  async addCommunication(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateCommunicationDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    const comm = await this.prisma.producerCommunication.create({
      data: {
        organizationId,
        producerId,
        channelCode: dto.channelCode,
        direction: dto.direction ?? 'outbound',
        subject: dto.subject,
        body: dto.body,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        createdBy: userId,
      },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return comm;
  }

  async addNote(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateNoteDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    const note = await this.prisma.producerNote.create({
      data: {
        organizationId,
        producerId,
        content: dto.content,
        isPinned: dto.isPinned ?? false,
        createdBy: userId,
      },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return note;
  }

  async assign(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: CreateAssignmentDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);

    await this.prisma.producerAssignment.updateMany({
      where: {
        producerId,
        organizationId,
        assignmentType: dto.assignmentType,
        endsAt: null,
      },
      data: { endsAt: new Date() },
    });

    const assignment = await this.prisma.producerAssignment.create({
      data: {
        organizationId,
        producerId,
        assignmentType: dto.assignmentType,
        assigneeId: dto.assigneeId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        reason: dto.reason,
        assignedBy: userId,
      },
    });

    const producerUpdate: Prisma.ProducerUpdateInput = {
      lastActivityAt: new Date(),
      updatedBy: userId,
      version: { increment: 1 },
    };
    if (dto.assignmentType === 'buyer') {
      producerUpdate.assignedBuyerId = dto.assigneeId;
    } else if (dto.assignmentType === 'technician') {
      producerUpdate.assignedTechnicianId = dto.assigneeId;
    }
    await this.prisma.producer.update({
      where: { id: producerId },
      data: producerUpdate,
    });

    await this.core.emitProducerAssigned(
      organizationId,
      producerId,
      {
        assignmentType: dto.assignmentType,
        assigneeId: dto.assigneeId,
        assignmentId: assignment.id,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return assignment;
  }

  async getAssignments(organizationId: string, producerId: string) {
    await this.producers.findOne(organizationId, producerId);
    return this.prisma.producerAssignment.findMany({
      where: { producerId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async linkFarm(
    organizationId: string,
    producerId: string,
    userId: string,
    dto: LinkFarmDto,
    ctx?: RequestContext,
  ) {
    await this.producers.findOne(organizationId, producerId);
    const farmUnit = await this.prisma.farmUnit.findFirst({
      where: { id: dto.farmResourceId, organizationId, deletedAt: null },
    });
    if (!farmUnit) {
      const legacy = await this.prisma.resource.findFirst({
        where: {
          id: dto.farmResourceId,
          organizationId,
          resourceType: 'farm',
          deletedAt: null,
        },
      });
      if (!legacy) throw new NotFoundException('Farm not found');
    }

    const territoryExisting = await this.prisma.producerTerritoryLink.findUnique({
      where: {
        farmUnitId_producerId: { farmUnitId: dto.farmResourceId, producerId },
      },
    });
    if (territoryExisting && !territoryExisting.unlinkedAt) {
      throw new ConflictException('Farm already linked');
    }

    if (dto.isPrimary) {
      await this.prisma.producerTerritoryLink.updateMany({
        where: { producerId, organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
      await this.prisma.producerFarmLink.updateMany({
        where: { producerId, organizationId, unlinkedAt: null },
        data: { isPrimary: false },
      });
    }

    if (farmUnit) {
      const territoryLink = territoryExisting
        ? await this.prisma.producerTerritoryLink.update({
            where: { id: territoryExisting.id },
            data: {
              unlinkedAt: null,
              relationshipType: dto.roleCode ?? 'owner',
              isPrimary: dto.isPrimary ?? false,
              linkedAt: new Date(),
            },
          })
        : await this.prisma.producerTerritoryLink.create({
            data: {
              organizationId,
              farmUnitId: dto.farmResourceId,
              producerId,
              relationshipType: dto.roleCode ?? 'owner',
              isPrimary: dto.isPrimary ?? false,
              createdBy: userId,
            },
          });
      await this.touchProducer(producerId, userId, organizationId, ctx);
      return territoryLink;
    }

    const existing = await this.prisma.producerFarmLink.findUnique({
      where: {
        producerId_farmResourceId: {
          producerId,
          farmResourceId: dto.farmResourceId,
        },
      },
    });
    if (existing && !existing.unlinkedAt) {
      throw new ConflictException('Farm already linked');
    }

    if (dto.isPrimary) {
      await this.prisma.producerFarmLink.updateMany({
        where: { producerId, organizationId, unlinkedAt: null },
        data: { isPrimary: false },
      });
    }

    const link = existing
      ? await this.prisma.producerFarmLink.update({
          where: { id: existing.id },
          data: {
            unlinkedAt: null,
            roleCode: dto.roleCode ?? 'owner',
            isPrimary: dto.isPrimary ?? false,
            linkedAt: new Date(),
          },
        })
      : await this.prisma.producerFarmLink.create({
          data: {
            organizationId,
            producerId,
            farmResourceId: dto.farmResourceId,
            roleCode: dto.roleCode ?? 'owner',
            isPrimary: dto.isPrimary ?? false,
            createdBy: userId,
          },
        });

    await this.touchProducer(producerId, userId, organizationId, ctx);
    return link;
  }

  async unlinkFarm(
    organizationId: string,
    producerId: string,
    farmLinkId: string,
    userId: string,
    ctx?: RequestContext,
  ) {
    const link = await this.prisma.producerFarmLink.findFirst({
      where: { id: farmLinkId, producerId, organizationId, unlinkedAt: null },
    });
    if (!link) throw new NotFoundException('Farm link not found');
    const updated = await this.prisma.producerFarmLink.update({
      where: { id: farmLinkId },
      data: { unlinkedAt: new Date() },
    });
    await this.touchProducer(producerId, userId, organizationId, ctx);
    return updated;
  }

  async merge(
    organizationId: string,
    userId: string,
    dto: MergeProducersDto,
    ctx?: RequestContext,
  ) {
    if (dto.sourceProducerId === dto.targetProducerId) {
      throw new ConflictException('Source and target must differ');
    }
    const [source, target] = await Promise.all([
      this.producers.findOne(organizationId, dto.sourceProducerId),
      this.producers.findOne(organizationId, dto.targetProducerId),
    ]);

    await this.prisma.$transaction([
      this.prisma.producerContact.updateMany({
        where: { producerId: source.id },
        data: { producerId: target.id },
      }),
      this.prisma.producerAddress.updateMany({
        where: { producerId: source.id },
        data: { producerId: target.id },
      }),
      this.prisma.producerCertification.updateMany({
        where: { producerId: source.id },
        data: { producerId: target.id },
      }),
      this.prisma.producerDocument.updateMany({
        where: { producerId: source.id },
        data: { producerId: target.id },
      }),
      this.prisma.producerFarmLink.updateMany({
        where: { producerId: source.id },
        data: { producerId: target.id },
      }),
      this.prisma.producer.update({
        where: { id: source.id },
        data: {
          deletedAt: new Date(),
          lifecycleStatus: 'archived',
          notes: `Fusionado en ${target.producerNumber}. ${dto.reason ?? ''}`,
          updatedBy: userId,
        },
      }),
      this.prisma.producer.update({
        where: { id: target.id },
        data: {
          goldenRecordVersion: { increment: 1 },
          version: { increment: 1 },
          updatedBy: userId,
          lastActivityAt: new Date(),
        },
      }),
    ]);

    await this.core.emitProducerMerged(
      organizationId,
      target.id,
      {
        sourceProducerId: source.id,
        targetProducerId: target.id,
        reason: dto.reason,
      },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return { targetProducerId: target.id, archivedSourceId: source.id };
  }

  private async touchProducer(
    producerId: string,
    userId: string,
    organizationId: string,
    ctx?: RequestContext,
  ) {
    const updated = await this.prisma.producer.update({
      where: { id: producerId },
      data: {
        lastActivityAt: new Date(),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
    await this.core.emitProducerUpdated(
      organizationId,
      producerId,
      { producerNumber: updated.producerNumber },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: {},
        newValues: { lastActivityAt: updated.lastActivityAt },
      },
    );
  }
}
