import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { DeviceDriverService } from './device-driver.service';
import { DeviceEdgeService } from './device-edge.service';

@Injectable()
export class DeviceSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DeviceSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly drivers: DeviceDriverService,
    private readonly edge: DeviceEdgeService,
  ) {}

  async onModuleInit() {
    await this.seedDrivers();
    const timer = setInterval(() => this.markOfflineDevices().catch(() => undefined), 60_000);
    timer.unref?.();
    this.logger.log('EIESDP scheduler started (offline detection 60s)');
  }

  private async seedDrivers() {
    const drivers = [
      { driverKey: 'modbus.scale', name: 'Balanza Modbus', deviceType: 'electronic_scale', protocol: 'modbus', handlerRef: 'driver.modbus.scale' },
      { driverKey: 'mqtt.weather', name: 'Estación MQTT', deviceType: 'weather_station', protocol: 'mqtt', handlerRef: 'driver.mqtt.weather' },
      { driverKey: 'ble.sensor', name: 'Sensor BLE', deviceType: 'ble_beacon', protocol: 'bluetooth', handlerRef: 'driver.ble.sensor' },
      { driverKey: 'opcua.plc', name: 'PLC OPC-UA', deviceType: 'plc', protocol: 'opcua', handlerRef: 'driver.opcua.plc' },
    ];
    for (const d of drivers) {
      await this.drivers.register(d);
    }
  }

  private async markOfflineDevices() {
    const threshold = new Date(Date.now() - 5 * 60_000);
    const stale = await this.prisma.eiesdpDevice.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        lastSeenAt: { lt: threshold },
      },
      take: 50,
    });
    for (const device of stale) {
      await this.prisma.eiesdpDevice.update({
        where: { id: device.id },
        data: { status: 'offline' },
      });
      await this.core.emitUserAction(
        device.organizationId,
        'Device',
        device.id,
        EVENT_TYPES.DEVICE_OFFLINE,
        { deviceKey: device.deviceKey },
      );
    }
  }
}
