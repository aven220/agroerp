import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { LotsService } from '@/core/fmdt/application/lots.service';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { generateEatpKey } from '../domain/eatp.engine';

@Injectable()
export class EatpLotService {
  constructor(
    private readonly lots: LotsService,
    private readonly prisma: PrismaService,
    private readonly eatpPrisma: EatpPrismaService,
  ) {}

  async list(organizationId: string, farmUnitId?: string) {
    return this.prisma.fieldLotProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(farmUnitId ? { farmUnitId } : {}),
      },
      include: {
        ftipLot: { select: { id: true, lotCode: true, boundaryGeo: true, areaHa: true } },
        farmUnit: { select: { id: true, farmCode: true, farmName: true } },
        agronomicStates: { take: 1, orderBy: { effectiveFrom: 'desc' } },
      },
      orderBy: { lotCode: 'asc' },
      take: 500,
    });
  }

  async get(organizationId: string, fieldLotId: string) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    const ftipLot = await this.prisma.farmLot.findUnique({ where: { id: lot.ftipLotUnitId } });
    const history = await this.prisma.fieldOperation.findMany({
      where: { organizationId, fieldLotId, deletedAt: null },
      orderBy: { operationDate: 'desc' },
      take: 20,
    });
    return { ...lot, ftipLot, recentOperations: history };
  }

  async listFtipLots(organizationId: string, farmUnitId?: string) {
    return this.prisma.farmLot.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(farmUnitId ? { farmUnitId } : {}),
      },
      include: {
        fieldLotProfile: { select: { id: true, status: true } },
        cropStands: { where: { status: 'active' }, take: 3 },
      },
      orderBy: { lotCode: 'asc' },
    });
  }

  async resolveQr(organizationId: string, qrCode: string) {
    const reg = await this.eatpPrisma.eatpQrRegistry.findFirst({
      where: { organizationId, qrCode },
    });
    if (!reg) throw new NotFoundException('QR no registrado');
    if (reg.entityType === 'field_lot') {
      return this.get(organizationId, reg.entityId);
    }
    return reg;
  }

  async registerQr(organizationId: string, qrCode: string, entityType: string, entityId: string, payload?: Record<string, unknown>) {
    return this.eatpPrisma.eatpQrRegistry.upsert({
      where: { organizationId_qrCode: { organizationId, qrCode } },
      create: { organizationId, qrCode, entityType, entityId, payload: (payload ?? {}) as object },
      update: { entityType, entityId, payload: (payload ?? {}) as object },
    });
  }

  async ensureQrForLot(organizationId: string, fieldLotId: string) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    const qrCode = `LOT-${lot.lotCode}`;
    await this.registerQr(organizationId, qrCode, 'field_lot', fieldLotId, { lotCode: lot.lotCode });
    return { qrCode, fieldLotId };
  }

  async autoRegisterQrs(organizationId: string) {
    const lots = await this.list(organizationId);
    let count = 0;
    for (const lot of lots) {
      await this.ensureQrForLot(organizationId, lot.id);
      count++;
    }
    return { registered: count };
  }
}
