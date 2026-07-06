import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EamAssetStatus, EamAssetType, EamDocumentType, EamLifecycleEventType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { canTransitionStatus, generateEamKey } from '../domain/eam-asset.engine';
import { EamAuditService } from './eam-audit.service';
import { EamIntegrationService } from './eam-integration.service';

export type CreateAssetInput = {
  name: string;
  assetType: EamAssetType;
  internalNumber?: string;
  familyKey?: string;
  subfamilyKey?: string;
  classificationKey?: string;
  parentAssetKey?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
  supplierKey?: string;
  purchaseDate?: Date;
  acquisitionCost?: number;
  residualValue?: number;
  warrantyExpiresAt?: Date;
  usefulLifeMonths?: number;
  costCenterKey?: string;
  locationKey?: string;
  responsibleUserId?: string;
  purchaseOrderKey?: string;
  description?: string;
};

@Injectable()
export class EamAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamIntegrationService,
  ) {}

  list(organizationId: string, filters?: { status?: EamAssetStatus; locationKey?: string; assetType?: EamAssetType }) {
    return this.prisma.eamAsset.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.locationKey ? { locationKey: filters.locationKey } : {}),
        ...(filters?.assetType ? { assetType: filters.assetType } : {}),
      },
      include: { family: true, subfamily: true, classification: true, location: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, assetKey: string) {
    const asset = await this.prisma.eamAsset.findFirst({
      where: { organizationId, assetKey },
      include: {
        family: true,
        subfamily: true,
        classification: true,
        location: true,
        lifecycleEvents: { orderBy: { recordedAt: 'desc' }, take: 50 },
        documents: { orderBy: { uploadedAt: 'desc' } },
        loans: { orderBy: { loanedAt: 'desc' }, take: 10 },
        transfers: { orderBy: { recordedAt: 'desc' }, take: 10 },
        hierarchyLinks: true,
        childLinks: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  findByCode(organizationId: string, code: string, type: 'qr' | 'barcode' | 'internal') {
    const where =
      type === 'qr' ? { qrCode: code }
        : type === 'barcode' ? { barcode: code }
          : { internalNumber: code };
    return this.prisma.eamAsset.findFirst({
      where: { organizationId, ...where },
      include: { location: true },
    });
  }

  async create(organizationId: string, userId: string, input: CreateAssetInput) {
    const seq = await this.prisma.eamAsset.count({ where: { organizationId } });
    const assetKey = generateEamKey('AST', seq + 1);
    const internalNumber = input.internalNumber ?? `INT-${String(seq + 1).padStart(6, '0')}`;
    const row = await this.prisma.eamAsset.create({
      data: {
        organizationId,
        assetKey,
        internalNumber,
        qrCode: `QR-${assetKey}`,
        barcode: `BC-${internalNumber}`,
        name: input.name,
        assetType: input.assetType,
        familyKey: input.familyKey,
        subfamilyKey: input.subfamilyKey,
        classificationKey: input.classificationKey,
        parentAssetKey: input.parentAssetKey,
        serialNumber: input.serialNumber,
        brand: input.brand,
        model: input.model,
        manufacturer: input.manufacturer,
        supplierKey: input.supplierKey,
        purchaseDate: input.purchaseDate,
        acquisitionCost: input.acquisitionCost ?? 0,
        residualValue: input.residualValue ?? 0,
        warrantyExpiresAt: input.warrantyExpiresAt,
        usefulLifeMonths: input.usefulLifeMonths ?? 60,
        costCenterKey: input.costCenterKey,
        locationKey: input.locationKey,
        responsibleUserId: input.responsibleUserId,
        purchaseOrderKey: input.purchaseOrderKey,
        description: input.description,
        status: 'registered',
      },
    });

    if (input.parentAssetKey) {
      const hSeq = await this.prisma.eamAssetHierarchy.count({ where: { organizationId } });
      await this.prisma.eamAssetHierarchy.create({
        data: {
          organizationId,
          hierarchyKey: generateEamKey('HRC', hSeq + 1),
          parentAssetKey: input.parentAssetKey,
          childAssetKey: assetKey,
        },
      });
    }

    await this.recordLifecycleEvent(organizationId, userId, assetKey, 'registration', 'draft', 'registered');
    await this.audit.log(organizationId, 'EamAsset', assetKey, 'created', userId);
    await this.integration.onAssetRegistered(organizationId, assetKey, input.purchaseOrderKey);
    return row;
  }

  async update(organizationId: string, userId: string, assetKey: string, patch: Partial<CreateAssetInput>) {
    const existing = await this.prisma.eamAsset.findFirst({ where: { organizationId, assetKey } });
    if (!existing) throw new NotFoundException('Asset not found');
    const row = await this.prisma.eamAsset.update({
      where: { id: existing.id },
      data: {
        name: patch.name,
        assetType: patch.assetType,
        familyKey: patch.familyKey,
        subfamilyKey: patch.subfamilyKey,
        classificationKey: patch.classificationKey,
        serialNumber: patch.serialNumber,
        brand: patch.brand,
        model: patch.model,
        manufacturer: patch.manufacturer,
        supplierKey: patch.supplierKey,
        purchaseDate: patch.purchaseDate,
        acquisitionCost: patch.acquisitionCost,
        residualValue: patch.residualValue,
        warrantyExpiresAt: patch.warrantyExpiresAt,
        usefulLifeMonths: patch.usefulLifeMonths,
        costCenterKey: patch.costCenterKey,
        locationKey: patch.locationKey,
        responsibleUserId: patch.responsibleUserId,
        description: patch.description,
      },
    });
    await this.audit.log(organizationId, 'EamAsset', assetKey, 'updated', userId);
    await this.integration.onAssetUpdated(organizationId, assetKey);
    return row;
  }

  async transitionStatus(
    organizationId: string,
    userId: string,
    assetKey: string,
    toStatus: EamAssetStatus,
    eventType: EamLifecycleEventType,
    notes?: string,
  ) {
    const asset = await this.prisma.eamAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (!canTransitionStatus(asset.status, toStatus)) {
      throw new BadRequestException(`Cannot transition from ${asset.status} to ${toStatus}`);
    }
    const data: Record<string, unknown> = { status: toStatus };
    if (toStatus === 'commissioned' || toStatus === 'operational') {
      data.commissionedAt = asset.commissionedAt ?? new Date();
    }
    if (['retired', 'sold', 'disposed'].includes(toStatus)) {
      data.retiredAt = new Date();
    }
    const row = await this.prisma.eamAsset.update({ where: { id: asset.id }, data: data as never });
    await this.recordLifecycleEvent(organizationId, userId, assetKey, eventType, asset.status, toStatus, notes);
    await this.audit.log(organizationId, 'EamAsset', assetKey, 'lifecycle_event', userId, { toStatus, eventType });
    await this.integration.onLifecycleEvent(organizationId, assetKey, eventType);
    if (['retired', 'sold', 'disposed'].includes(toStatus)) {
      await this.integration.onAssetRetired(organizationId, assetKey, eventType);
    }
    return row;
  }

  async recordLifecycleEvent(
    organizationId: string,
    userId: string,
    assetKey: string,
    eventType: EamLifecycleEventType,
    fromStatus?: EamAssetStatus,
    toStatus?: EamAssetStatus,
    notes?: string,
    fromLocationKey?: string,
    toLocationKey?: string,
  ) {
    const seq = await this.prisma.eamLifecycleEvent.count({ where: { organizationId } });
    return this.prisma.eamLifecycleEvent.create({
      data: {
        organizationId,
        eventKey: generateEamKey('LCE', seq + 1),
        assetKey,
        eventType,
        fromStatus,
        toStatus,
        fromLocationKey,
        toLocationKey,
        notes,
        recordedBy: userId,
      },
    });
  }

  async uploadDocument(
    organizationId: string,
    userId: string,
    assetKey: string,
    docType: EamDocumentType,
    title: string,
    storageUrl: string,
  ) {
    await this.get(organizationId, assetKey);
    const seq = await this.prisma.eamAssetDocument.count({ where: { organizationId } });
    const row = await this.prisma.eamAssetDocument.create({
      data: {
        organizationId,
        documentKey: generateEamKey('DOC', seq + 1),
        assetKey,
        docType,
        title,
        storageUrl,
        uploadedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EamAssetDocument', row.documentKey, 'document_uploaded', userId);
    await this.integration.onDocumentUploaded(organizationId, row.documentKey, docType);
    return row;
  }

  async transfer(
    organizationId: string,
    userId: string,
    assetKey: string,
    toLocationKey: string,
    transferType: 'transfer' | 'relocation' = 'transfer',
    notes?: string,
  ) {
    const asset = await this.prisma.eamAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException('Asset not found');
    const seq = await this.prisma.eamAssetTransfer.count({ where: { organizationId } });
    const transferKey = generateEamKey('TRF', seq + 1);
    const row = await this.prisma.eamAssetTransfer.create({
      data: {
        organizationId,
        transferKey,
        assetKey,
        fromLocationKey: asset.locationKey,
        toLocationKey,
        transferType,
        notes,
        recordedBy: userId,
      },
    });
    await this.prisma.eamAsset.update({
      where: { id: asset.id },
      data: { locationKey: toLocationKey, status: asset.status === 'in_transfer' ? 'operational' : asset.status },
    });
    const eventType = transferType === 'relocation' ? 'relocation' : 'transfer';
    await this.recordLifecycleEvent(
      organizationId, userId, assetKey, eventType,
      asset.status, asset.status, notes, asset.locationKey ?? undefined, toLocationKey,
    );
    await this.audit.log(organizationId, 'EamAssetTransfer', transferKey, transferType === 'relocation' ? 'relocation' : 'transfer', userId);
    await this.integration.onAssetTransferred(organizationId, transferKey, assetKey);
    return row;
  }

  async loan(
    organizationId: string,
    userId: string,
    assetKey: string,
    borrowerName: string,
    borrowerId?: string,
    dueAt?: Date,
    notes?: string,
  ) {
    const asset = await this.prisma.eamAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException('Asset not found');
    const seq = await this.prisma.eamAssetLoan.count({ where: { organizationId } });
    const loanKey = generateEamKey('LON', seq + 1);
    const row = await this.prisma.eamAssetLoan.create({
      data: { organizationId, loanKey, assetKey, borrowerName, borrowerId, dueAt, notes, recordedBy: userId },
    });
    await this.transitionStatus(organizationId, userId, assetKey, 'on_loan', 'loan', notes);
    await this.audit.log(organizationId, 'EamAssetLoan', loanKey, 'loan', userId);
    await this.integration.onAssetLoaned(organizationId, loanKey, assetKey);
    return row;
  }

  async returnLoan(organizationId: string, userId: string, loanKey: string) {
    const loan = await this.prisma.eamAssetLoan.findFirst({ where: { organizationId, loanKey } });
    if (!loan) throw new NotFoundException('Loan not found');
    const row = await this.prisma.eamAssetLoan.update({
      where: { id: loan.id },
      data: { returnedAt: new Date() },
    });
    await this.transitionStatus(organizationId, userId, loan.assetKey, 'operational', 'loan_return');
    await this.audit.log(organizationId, 'EamAssetLoan', loanKey, 'loan_return', userId);
    return row;
  }

  scanCode(organizationId: string, userId: string, code: string, scanType: 'qr' | 'barcode') {
    return this.findByCode(organizationId, code, scanType).then(async (asset) => {
      if (!asset) throw new NotFoundException('Asset not found');
      await this.audit.log(organizationId, 'EamAsset', asset.assetKey, scanType === 'qr' ? 'qr_scan' : 'barcode_scan', userId, { code });
      return asset;
    });
  }
}
