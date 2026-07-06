import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';

@Injectable()
export class EscmTransportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  listCarriers(organizationId: string) {
    return this.prisma.escmCarrier.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async upsertCarrier(
    organizationId: string,
    userId: string,
    input: {
      carrierKey?: string;
      name: string;
      taxId?: string;
      contactPhone?: string;
      contactEmail?: string;
    },
  ) {
    const carrierKey = input.carrierKey ?? `CAR-${Date.now()}`.slice(0, 80);
    const row = await this.prisma.escmCarrier.upsert({
      where: { organizationId_carrierKey: { organizationId, carrierKey } },
      update: {
        name: input.name,
        taxId: input.taxId,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
      },
      create: {
        organizationId,
        carrierKey,
        name: input.name,
        taxId: input.taxId,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Carrier', carrierKey, 'upsert', userId, input);
    return row;
  }

  listVehicles(organizationId: string, carrierKey?: string) {
    return this.prisma.escmVehicle.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(carrierKey ? { carrierKey } : {}),
      },
      orderBy: { plateNumber: 'asc' },
    });
  }

  async upsertVehicle(
    organizationId: string,
    userId: string,
    input: {
      vehicleKey?: string;
      carrierKey?: string;
      plateNumber: string;
      vehicleType: string;
      capacityKg?: number;
      capacityM3?: number;
      gpsDeviceId?: string;
    },
  ) {
    const vehicleKey = input.vehicleKey ?? `VEH-${Date.now()}`.slice(0, 80);
    let carrierId: string | undefined;
    if (input.carrierKey) {
      const c = await this.prisma.escmCarrier.findFirst({
        where: { organizationId, carrierKey: input.carrierKey },
      });
      carrierId = c?.id;
    }
    const row = await this.prisma.escmVehicle.upsert({
      where: { organizationId_vehicleKey: { organizationId, vehicleKey } },
      update: {
        carrierId,
        carrierKey: input.carrierKey,
        plateNumber: input.plateNumber,
        vehicleType: input.vehicleType,
        capacityKg: input.capacityKg ?? 0,
        capacityM3: input.capacityM3 ?? 0,
        gpsDeviceId: input.gpsDeviceId,
      },
      create: {
        organizationId,
        vehicleKey,
        carrierId,
        carrierKey: input.carrierKey,
        plateNumber: input.plateNumber,
        vehicleType: input.vehicleType,
        capacityKg: input.capacityKg ?? 0,
        capacityM3: input.capacityM3 ?? 0,
        gpsDeviceId: input.gpsDeviceId,
      },
    });
    await this.audit.log(organizationId, 'Vehicle', vehicleKey, 'upsert', userId, input);
    return row;
  }

  listDrivers(organizationId: string) {
    return this.prisma.escmDriver.findMany({
      where: { organizationId, isActive: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async upsertDriver(
    organizationId: string,
    userId: string,
    input: {
      driverKey?: string;
      fullName: string;
      documentNumber?: string;
      phone?: string;
      licenseNumber?: string;
      userId?: string;
    },
  ) {
    const driverKey = input.driverKey ?? `DRV-${Date.now()}`.slice(0, 80);
    const row = await this.prisma.escmDriver.upsert({
      where: { organizationId_driverKey: { organizationId, driverKey } },
      update: {
        fullName: input.fullName,
        documentNumber: input.documentNumber,
        phone: input.phone,
        licenseNumber: input.licenseNumber,
        userId: input.userId,
      },
      create: {
        organizationId,
        driverKey,
        fullName: input.fullName,
        documentNumber: input.documentNumber,
        phone: input.phone,
        licenseNumber: input.licenseNumber,
        userId: input.userId,
      },
    });
    await this.audit.log(organizationId, 'Driver', driverKey, 'upsert', userId, input);
    return row;
  }

  async autoAssign(
    organizationId: string,
    loadKg: number,
  ) {
    const vehicles = await this.listVehicles(organizationId);
    const suitable = vehicles
      .filter((v) => v.capacityKg <= 0 || loadKg <= v.capacityKg)
      .sort((a, b) => a.capacityKg - b.capacityKg);
    const vehicle = suitable[0];
    if (!vehicle) return null;
    const drivers = await this.listDrivers(organizationId);
    const driver = drivers[0];
    return { vehicle, driver, carrierKey: vehicle.carrierKey };
  }

  async getVehicle(organizationId: string, vehicleKey: string) {
    const row = await this.prisma.escmVehicle.findFirst({
      where: { organizationId, vehicleKey },
    });
    if (!row) throw new NotFoundException(`Vehículo ${vehicleKey} no encontrado`);
    return row;
  }
}
