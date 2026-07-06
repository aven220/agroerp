import { Injectable, NotFoundException } from '@nestjs/common';
import { EpscmTmsOperationalStatus, EpscmTmsVehicleOwnership } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';

@Injectable()
export class EpscmTmsFleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  listTypes(organizationId: string) {
    return this.prisma.epscmTmsVehicleType.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
  }

  async createType(organizationId: string, userId: string, code: string, name: string, maxWeight = 0, maxVolume = 0) {
    const seq = await this.prisma.epscmTmsVehicleType.count({ where: { organizationId } });
    const type = await this.prisma.epscmTmsVehicleType.create({
      data: {
        organizationId,
        typeKey: generateEpscmTmsKey('VT', seq + 1),
        code,
        name,
        maxWeight,
        maxVolume,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsVehicleType', type.typeKey, 'created', userId);
    return type;
  }

  listVehicles(organizationId: string, status?: EpscmTmsOperationalStatus) {
    return this.prisma.epscmTmsVehicle.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { type: true, documents: true },
      orderBy: { code: 'asc' },
    });
  }

  async getVehicle(organizationId: string, vehicleKey: string) {
    const v = await this.prisma.epscmTmsVehicle.findFirst({
      where: { organizationId, vehicleKey },
      include: { type: true, documents: true, trips: { take: 20, orderBy: { createdAt: 'desc' } } },
    });
    if (!v) throw new NotFoundException('Vehicle not found');
    return v;
  }

  async createVehicle(
    organizationId: string,
    userId: string,
    input: {
      typeKey: string;
      code: string;
      plateNumber: string;
      ownership?: EpscmTmsVehicleOwnership;
      maxWeight?: number;
      maxVolume?: number;
    },
  ) {
    const seq = await this.prisma.epscmTmsVehicle.count({ where: { organizationId } });
    const vehicle = await this.prisma.epscmTmsVehicle.create({
      data: {
        organizationId,
        vehicleKey: generateEpscmTmsKey('VEH', seq + 1),
        typeKey: input.typeKey,
        code: input.code,
        plateNumber: input.plateNumber,
        ownership: input.ownership ?? 'own',
        maxWeight: input.maxWeight ?? 0,
        maxVolume: input.maxVolume ?? 0,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsVehicle', vehicle.vehicleKey, 'created', userId);
    return vehicle;
  }

  async addDocument(
    organizationId: string,
    userId: string,
    vehicleKey: string,
    docType: string,
    expiresAt?: Date,
    docNumber?: string,
    storageUrl?: string,
  ) {
    const seq = await this.prisma.epscmTmsVehicleDocument.count({ where: { organizationId } });
    const doc = await this.prisma.epscmTmsVehicleDocument.create({
      data: {
        organizationId,
        documentKey: generateEpscmTmsKey('VDOC', seq + 1),
        vehicleKey,
        docType,
        docNumber,
        expiresAt,
        storageUrl,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsVehicleDocument', doc.documentKey, 'created', userId);
    return doc;
  }

  expiringDocuments(organizationId: string, withinDays = 30) {
    const limit = new Date();
    limit.setDate(limit.getDate() + withinDays);
    return this.prisma.epscmTmsVehicleDocument.findMany({
      where: { organizationId, expiresAt: { lte: limit } },
      include: { vehicle: true },
      orderBy: { expiresAt: 'asc' },
    });
  }

  async seed(organizationId: string, userId: string) {
    const existing = await this.prisma.epscmTmsVehicleType.count({ where: { organizationId } });
    if (existing > 0) return { types: await this.listTypes(organizationId), vehicles: await this.listVehicles(organizationId) };

    const type = await this.createType(organizationId, userId, 'TRK-01', 'Camión rígido', 12000, 45);
    await this.createVehicle(organizationId, userId, {
      typeKey: type.typeKey,
      code: 'VEH-01',
      plateNumber: 'ABC123',
      ownership: 'own',
      maxWeight: 12000,
      maxVolume: 45,
    });
    await this.createVehicle(organizationId, userId, {
      typeKey: type.typeKey,
      code: 'VEH-02',
      plateNumber: 'XYZ789',
      ownership: 'outsourced',
      maxWeight: 8000,
      maxVolume: 30,
    });
    return { types: await this.listTypes(organizationId), vehicles: await this.listVehicles(organizationId) };
  }
}
