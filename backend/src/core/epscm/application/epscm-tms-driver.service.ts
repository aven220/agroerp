import { Injectable, NotFoundException } from '@nestjs/common';
import { EpscmTmsDriverStatus, EpscmTmsDriverType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';

@Injectable()
export class EpscmTmsDriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  list(organizationId: string, status?: EpscmTmsDriverStatus) {
    return this.prisma.epscmTmsDriver.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { licenses: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async get(organizationId: string, driverKey: string) {
    const d = await this.prisma.epscmTmsDriver.findFirst({
      where: { organizationId, driverKey },
      include: { licenses: true, trips: { take: 20, orderBy: { createdAt: 'desc' } } },
    });
    if (!d) throw new NotFoundException('Driver not found');
    return d;
  }

  async create(
    organizationId: string,
    userId: string,
    input: { code: string; fullName: string; driverType?: EpscmTmsDriverType; phone?: string },
  ) {
    const seq = await this.prisma.epscmTmsDriver.count({ where: { organizationId } });
    const driver = await this.prisma.epscmTmsDriver.create({
      data: {
        organizationId,
        driverKey: generateEpscmTmsKey('DRV', seq + 1),
        code: input.code,
        fullName: input.fullName,
        driverType: input.driverType ?? 'internal',
        phone: input.phone,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsDriver', driver.driverKey, 'created', userId);
    return driver;
  }

  async addLicense(
    organizationId: string,
    userId: string,
    driverKey: string,
    category: string,
    licenseNumber: string,
    expiresAt?: Date,
  ) {
    const seq = await this.prisma.epscmTmsDriverLicense.count({ where: { organizationId } });
    const license = await this.prisma.epscmTmsDriverLicense.create({
      data: {
        organizationId,
        licenseKey: generateEpscmTmsKey('LIC', seq + 1),
        driverKey,
        category,
        licenseNumber,
        expiresAt,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsDriverLicense', license.licenseKey, 'created', userId);
    return license;
  }

  expiringLicenses(organizationId: string, withinDays = 30) {
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    return this.prisma.epscmTmsDriverLicense.findMany({
      where: { organizationId, expiresAt: { lte: limit } },
      include: { driver: true },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async setAvailability(organizationId: string, userId: string, driverKey: string, status: EpscmTmsDriverStatus) {
    const driver = await this.get(organizationId, driverKey);
    return this.prisma.epscmTmsDriver.update({
      where: { id: driver.id },
      data: { status },
    });
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.epscmTmsDriver.count({ where: { organizationId } });
    if (existing > 0) return this.list(organizationId);

    const d1 = await this.create(organizationId, userId, { code: 'DRV-01', fullName: 'Conductor Interno', driverType: 'internal' });
    await this.addLicense(organizationId, userId, d1.driverKey, 'C2', 'LIC-001', new Date(Date.now() + 365 * 86400000));
    await this.create(organizationId, userId, { code: 'DRV-02', fullName: 'Conductor Externo', driverType: 'external' });
    return this.list(organizationId);
  }
}
