import { Injectable } from '@nestjs/common';
import { EiesdpTelemetryPayload } from '@agroerp/shared';
import { DeviceTelemetryService } from './device-telemetry.service';
import { DeviceMqttBridgeService } from './device-mqtt.bridge';

@Injectable()
export class DeviceIngestGatewayService {
  constructor(
    private readonly telemetry: DeviceTelemetryService,
    private readonly mqtt: DeviceMqttBridgeService,
  ) {}

  ingestHttp(organizationId: string, payload: EiesdpTelemetryPayload) {
    return this.telemetry.ingest(organizationId, payload);
  }

  ingestHttpBatch(organizationId: string, payloads: EiesdpTelemetryPayload[]) {
    return this.telemetry.ingestBatch(organizationId, payloads);
  }

  ingestWebSocket(organizationId: string, payload: EiesdpTelemetryPayload) {
    return this.telemetry.ingest(organizationId, payload);
  }

  ingestMqttRelay(organizationId: string, topic: string, payload: Record<string, unknown>) {
    return this.mqtt.relayMessage(organizationId, topic, payload);
  }

  sendCommand(organizationId: string, deviceKey: string, command: Record<string, unknown>) {
    return this.mqtt.publishCommand(organizationId, deviceKey, command);
  }

  amqpReady() {
    return { ready: true, exchange: 'agroerp.iot', routingKey: 'telemetry.{orgId}.{deviceKey}' };
  }

  grpcReady() {
    return { ready: true, service: 'agroerp.iot.v1.TelemetryService' };
  }
}
