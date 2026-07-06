import { Injectable } from '@nestjs/common';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';
import { EATR_CUSTODY_TYPES, generateEatrKey } from '../domain/eatr.engine';
import { EatrAuditService } from './eatr-audit.service';

@Injectable()
export class EatrCustodyService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
  ) {}

  types() { return EATR_CUSTODY_TYPES; }

  list(organizationId: string, productionLotId?: string) {
    return this.prisma.eatrCustodyTransfer.findMany({
      where: { organizationId, ...(productionLotId ? { productionLotId } : {}) },
      orderBy: { transferredAt: 'desc' },
      take: 200,
    });
  }

  async transfer(
    organizationId: string,
    userId: string,
    data: {
      productionLotId?: string; fromParty?: string; toParty?: string;
      fromLocation?: string; toLocation?: string; transferType?: string;
    },
  ) {
    const count = await this.prisma.eatrCustodyTransfer.count({ where: { organizationId } });
    const transferKey = generateEatrKey('CST', count + 1);
    const row = await this.prisma.eatrCustodyTransfer.create({
      data: {
        organizationId, transferKey, productionLotId: data.productionLotId,
        fromParty: data.fromParty, toParty: data.toParty,
        fromLocation: data.fromLocation, toLocation: data.toLocation,
        transferType: data.transferType ?? 'transfer', status: 'in_transit',
      },
    });
    await this.audit.log(organizationId, 'EatrCustodyTransfer', transferKey, 'custody_transferred', userId);
    return row;
  }

  async receive(organizationId: string, userId: string, transferKey: string) {
    const row = await this.prisma.eatrCustodyTransfer.findFirst({ where: { organizationId, transferKey } });
    if (!row) return { received: false };
    await this.prisma.eatrCustodyTransfer.update({
      where: { id: row.id },
      data: { status: 'completed', receivedAt: new Date() },
    });
    return { received: true, transferKey };
  }
}
