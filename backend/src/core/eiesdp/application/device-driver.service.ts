import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class DeviceDriverService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.eiesdpDeviceDriver.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  register(data: {
    driverKey: string;
    name: string;
    deviceType: string;
    protocol: string;
    handlerRef: string;
    configSchema?: Record<string, unknown>;
  }) {
    return this.prisma.eiesdpDeviceDriver.upsert({
      where: { driverKey: data.driverKey },
      update: {
        name: data.name,
        deviceType: data.deviceType as 'custom_driver',
        protocol: data.protocol as 'mqtt',
        handlerRef: data.handlerRef,
        configSchema: (data.configSchema ?? {}) as object,
        isActive: true,
      },
      create: {
        driverKey: data.driverKey,
        name: data.name,
        deviceType: data.deviceType as 'custom_driver',
        protocol: data.protocol as 'mqtt',
        handlerRef: data.handlerRef,
        configSchema: (data.configSchema ?? {}) as object,
      },
    });
  }
}
