import { Injectable } from '@nestjs/common';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';
import { EATR_POSTHARVEST_STEPS, generateEatrKey, validateQualityConformity } from '../domain/eatr.engine';
import { EatrAuditService } from './eatr-audit.service';
import { EatrTraceService } from './eatr-trace.service';

@Injectable()
export class EatrPostharvestService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
    private readonly trace: EatrTraceService,
  ) {}

  stepTypes() { return EATR_POSTHARVEST_STEPS; }

  list(organizationId: string, stepType?: string) {
    return this.prisma.eatrPostharvestStep.findMany({
      where: { organizationId, ...(stepType ? { stepType } : {}) },
      orderBy: { completedAt: 'desc' },
      take: 200,
    });
  }

  async recordStep(
    organizationId: string,
    userId: string,
    data: { stepType: string; commercialLotId?: string; fieldLotId?: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.eatrPostharvestStep.count({ where: { organizationId } });
    const stepKey = generateEatrKey('PHS', count + 1);
    const row = await this.prisma.eatrPostharvestStep.create({
      data: {
        organizationId, stepKey, stepType: data.stepType,
        commercialLotId: data.commercialLotId, fieldLotId: data.fieldLotId,
        recordedBy: userId, metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.trace.recordEvent(organizationId, userId, {
      eventType: 'postharvest', fieldLotId: data.fieldLotId, payload: { stepType: data.stepType, stepKey },
    });
    await this.audit.log(organizationId, 'EatrPostharvestStep', stepKey, 'postharvest_step', userId);
    return row;
  }
}

@Injectable()
export class EatrQualityService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
  ) {}

  list(organizationId: string, commercialLotId?: string) {
    return this.prisma.eatrQualityInspection.findMany({
      where: { organizationId, ...(commercialLotId ? { commercialLotId } : {}) },
      orderBy: { inspectedAt: 'desc' },
      take: 200,
    });
  }

  async inspect(
    organizationId: string,
    userId: string,
    data: {
      commercialLotId?: string; caliber?: string; weightKg?: number; colorGrade?: string;
      maturityGrade?: string; moisturePct?: number; defectsPct?: number; sampleRef?: string;
      photoRefs?: string[]; results?: Record<string, unknown>;
    },
  ) {
    const conformity = validateQualityConformity({ moisturePct: data.moisturePct, defectsPct: data.defectsPct });
    const count = await this.prisma.eatrQualityInspection.count({ where: { organizationId } });
    const inspectionKey = generateEatrKey('QIN', count + 1);
    const row = await this.prisma.eatrQualityInspection.create({
      data: {
        organizationId, inspectionKey, commercialLotId: data.commercialLotId,
        caliber: data.caliber, weightKg: data.weightKg, colorGrade: data.colorGrade,
        maturityGrade: data.maturityGrade, moisturePct: data.moisturePct, defectsPct: data.defectsPct,
        sampleRef: data.sampleRef, isConforming: conformity.isConforming,
        nonConformance: conformity.isConforming ? null : 'No conforme',
        photoRefs: data.photoRefs ?? [], inspectedBy: userId,
        results: (data.results ?? conformity) as object,
      },
    });
    await this.audit.log(organizationId, 'EatrQualityInspection', inspectionKey, 'quality_inspected', userId, conformity);
    return row;
  }
}

@Injectable()
export class EatrPackagingService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eatrPackageUnit.findMany({
      where: { organizationId },
      include: { commercialLot: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createPackage(
    organizationId: string,
    userId: string,
    data: {
      commercialLotId?: string; packageType: string; presentation?: string;
      labelCode?: string; logisticUnit?: string; quantity?: number;
    },
  ) {
    const count = await this.prisma.eatrPackageUnit.count({ where: { organizationId } });
    const packageKey = generateEatrKey('PKG', count + 1);
    const qrCode = `QR-${packageKey}`;
    const barcode = `BC${packageKey.replace(/-/g, '')}`;
    const row = await this.prisma.eatrPackageUnit.create({
      data: {
        organizationId, packageKey, commercialLotId: data.commercialLotId,
        packageType: data.packageType, presentation: data.presentation,
        labelCode: data.labelCode ?? packageKey, qrCode, barcode,
        logisticUnit: data.logisticUnit, quantity: data.quantity ?? 1,
      },
    });
    await this.audit.log(organizationId, 'EatrPackageUnit', packageKey, 'package_labeled', userId);
    return row;
  }
}

@Injectable()
export class EatrExportService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
  ) {}

  listMarkets(organizationId: string) {
    return this.prisma.eatrExportMarket.findMany({
      where: { organizationId, status: 'active' },
      include: { shipments: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  async registerMarket(
    organizationId: string,
    data: { countryCode: string; marketName: string; requirements?: unknown[] },
  ) {
    const count = await this.prisma.eatrExportMarket.count({ where: { organizationId } });
    const marketKey = generateEatrKey('MKT', count + 1);
    return this.prisma.eatrExportMarket.create({
      data: {
        organizationId, marketKey, countryCode: data.countryCode, marketName: data.marketName,
        requirements: (data.requirements ?? []) as object,
      },
    });
  }

  listShipments(organizationId: string) {
    return this.prisma.eatrExportShipment.findMany({
      where: { organizationId },
      include: { market: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async prepareShipment(
    organizationId: string,
    userId: string,
    data: {
      marketKey?: string; containerRef?: string; coldChain?: boolean;
      documents?: unknown[]; certificates?: unknown[];
    },
  ) {
    let marketId: string | undefined;
    if (data.marketKey) {
      const m = await this.prisma.eatrExportMarket.findFirst({ where: { organizationId, marketKey: data.marketKey } });
      marketId = m?.id;
    }
    const count = await this.prisma.eatrExportShipment.count({ where: { organizationId } });
    const shipmentKey = generateEatrKey('SHP', count + 1);
    const row = await this.prisma.eatrExportShipment.create({
      data: {
        organizationId, shipmentKey, marketId, containerRef: data.containerRef,
        coldChain: data.coldChain ?? false,
        documents: (data.documents ?? []) as object,
        certificates: (data.certificates ?? []) as object,
        status: 'scheduled',
      },
    });
    await this.audit.log(organizationId, 'EatrExportShipment', shipmentKey, 'export_prepared', userId);
    return row;
  }
}
