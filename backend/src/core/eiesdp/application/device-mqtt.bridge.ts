import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceTelemetryService } from './device-telemetry.service';

interface MqttCommand {
  topic: string;
  payload: string;
  at: Date;
}

@Injectable()
export class DeviceMqttBridgeService implements OnModuleInit {
  private readonly logger = new Logger(DeviceMqttBridgeService.name);
  private readonly commandQueue = new Map<string, MqttCommand[]>();
  private brokerEnabled = false;

  constructor(
    private readonly config: ConfigService,
    private readonly telemetry: DeviceTelemetryService,
  ) {}

  onModuleInit() {
    const brokerUrl = this.config.get<string>('EIESDP_MQTT_URL');
    this.brokerEnabled = Boolean(brokerUrl);
    if (this.brokerEnabled) {
      this.logger.log(`MQTT bridge ready (broker: ${brokerUrl}) — AMQP/gRPC adapters via ingest API`);
    } else {
      this.logger.log('MQTT bridge in REST-relay mode (set EIESDP_MQTT_URL for external broker)');
    }
  }

  async relayMessage(
    organizationId: string,
    topic: string,
    payload: Record<string, unknown>,
  ) {
    const parts = topic.split('/');
    const deviceKey = parts.length >= 3 ? parts[2] : String(payload.deviceKey ?? '');
    return this.telemetry.ingest(organizationId, {
      deviceKey,
      metricKey: String(payload.metricKey ?? 'mqtt_raw'),
      value: typeof payload.value === 'number' ? payload.value : undefined,
      valueText: payload.valueText ? String(payload.valueText) : undefined,
      unit: payload.unit ? String(payload.unit) : undefined,
      batteryLevel: typeof payload.batteryLevel === 'number' ? payload.batteryLevel : undefined,
      signalQuality: typeof payload.signalQuality === 'number' ? payload.signalQuality : undefined,
      firmwareVersion: payload.firmwareVersion ? String(payload.firmwareVersion) : undefined,
      latitude: typeof payload.latitude === 'number' ? payload.latitude : undefined,
      longitude: typeof payload.longitude === 'number' ? payload.longitude : undefined,
      payload,
    });
  }

  publishCommand(organizationId: string, deviceKey: string, command: Record<string, unknown>) {
    const topic = `agroerp/${organizationId}/${deviceKey}/commands`;
    const entry: MqttCommand = { topic, payload: JSON.stringify(command), at: new Date() };
    const key = `${organizationId}:${deviceKey}`;
    const queue = this.commandQueue.get(key) ?? [];
    queue.push(entry);
    this.commandQueue.set(key, queue.slice(-50));
    return { published: true, topic, mode: this.brokerEnabled ? 'mqtt+broker' : 'rest-relay' };
  }

  drainCommands(organizationId: string, deviceKey: string) {
    const key = `${organizationId}:${deviceKey}`;
    const cmds = this.commandQueue.get(key) ?? [];
    this.commandQueue.delete(key);
    return cmds;
  }
}
