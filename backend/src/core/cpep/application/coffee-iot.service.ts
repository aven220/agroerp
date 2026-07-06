import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoffeeReceptionService } from './coffee-reception.service';
import { CoffeeScaleService } from './coffee-scale.service';
import { CoffeeWeighingService } from './coffee-weighing.service';

@Injectable()
export class CoffeeIotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reception: CoffeeReceptionService,
    private readonly scales: CoffeeScaleService,
    private readonly weighing: CoffeeWeighingService,
  ) {}

  async listScales(organizationId: string) {
    const registered = await this.scales.list(organizationId);
    if (registered.length) {
      return registered.map((s) => ({
        deviceKey: s.iotDeviceKey ?? s.scaleKey,
        scaleKey: s.scaleKey,
        name: s.name,
        status: s.status,
        lastSeenAt: s.lastSeenAt,
        protocol: s.connectionType,
        connectionType: s.connectionType,
        certified: s.certified,
        firmwareVersion: s.firmwareVersion,
        driverKey: s.driverKey,
        locationLabel: s.locationLabel,
        lastWeightKg: s.lastWeightKg,
      }));
    }

    return this.prisma.eiesdpDevice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        deviceType: 'electronic_scale',
        status: { in: ['active', 'registered'] },
      },
      select: {
        deviceKey: true,
        name: true,
        status: true,
        lastSeenAt: true,
        protocol: true,
        firmwareVersion: true,
        driverKey: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async captureFromScale(
    organizationId: string,
    userId: string,
    ticketKey: string,
    deviceKey: string,
    weighingType: 'gross' | 'tare' = 'gross',
  ) {
    const device = await this.prisma.eiesdpDevice.findFirst({
      where: {
        organizationId,
        deviceKey,
        deletedAt: null,
        deviceType: 'electronic_scale',
      },
    });
    if (!device) throw new BadRequestException(`Balanza IoT ${deviceKey} no encontrada`);

    const reading = await this.prisma.eiesdpTelemetryReading.findFirst({
      where: {
        organizationId,
        deviceKey,
        metricKey: { in: ['weight_kg', 'weight', 'value', 'gross_kg', 'tare_kg'] },
      },
      orderBy: { recordedAt: 'desc' },
    });

    const weightKg = reading?.value ?? Number((device.metadata as Record<string, unknown>)?.lastWeightKg ?? 0);
    if (!weightKg || weightKg <= 0) {
      throw new BadRequestException('Sin lectura válida de balanza IoT');
    }

    await this.scales.upsert(organizationId, userId, {
      scaleKey: deviceKey,
      name: device.name,
      connectionType:
        device.protocol === 'usb'
          ? 'usb'
          : device.protocol === 'serial'
            ? 'serial_rs232'
            : device.protocol === 'tcp'
              ? 'tcp_ip'
              : device.protocol === 'bluetooth'
                ? 'bluetooth'
                : device.protocol === 'modbus'
                  ? 'ethernet'
                  : 'wifi',
      iotDeviceKey: deviceKey,
      firmwareVersion: device.firmwareVersion ?? undefined,
      certified: true,
      driverKey: device.driverKey ?? undefined,
    });
    await this.scales.heartbeat(organizationId, deviceKey, {
      weightKg,
      stable: true,
      firmwareVersion: device.firmwareVersion ?? undefined,
    });

    const open = await this.prisma.cpepWeighingSession.findFirst({
      where: {
        organizationId,
        ticket: { ticketKey },
        status: { notIn: ['sent_to_quality', 'cancelled'] },
      },
    });

    if (open) {
      await this.weighing.captureReading(organizationId, userId, open.sessionKey, {
        weighingType,
        weightKg,
        source: 'iot',
        freeze: true,
      });
      if (weighingType === 'gross') {
        await this.weighing.confirmGross(organizationId, userId, open.sessionKey);
      } else {
        await this.weighing.confirmTare(organizationId, userId, open.sessionKey);
      }
      const session = await this.weighing.getSession(organizationId, open.sessionKey);
      if (session.grossWeightKg != null && session.tareWeightKg != null && session.status !== 'sent_to_quality') {
        await this.weighing.validateSession(organizationId, userId, open.sessionKey);
        await this.weighing.confirmFinal(organizationId, userId, open.sessionKey);
        return this.weighing.sendToQuality(organizationId, userId, open.sessionKey);
      }
      return session;
    }

    const payload =
      weighingType === 'gross'
        ? { grossWeightKg: weightKg, source: 'iot', iotDeviceKey: deviceKey, scaleKey: deviceKey }
        : { tareWeightKg: weightKg, source: 'iot', iotDeviceKey: deviceKey, scaleKey: deviceKey };

    const ticket = await this.reception.findOne(organizationId, ticketKey);
    const gross = weighingType === 'gross' ? weightKg : ticket.grossWeightKg;
    const tare = weighingType === 'tare' ? weightKg : ticket.tareWeightKg;

    if (gross != null && tare != null) {
      return this.weighing.quickWeigh(organizationId, userId, ticketKey, {
        grossWeightKg: gross,
        tareWeightKg: tare,
        source: 'iot',
        iotDeviceKey: deviceKey,
        scaleKey: deviceKey,
      });
    }

    return this.reception.weigh(organizationId, userId, ticketKey, payload);
  }
}
