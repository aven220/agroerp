import { EIESDP_DEVICE_TYPES, EIESDP_PROTOCOLS } from '@agroerp/shared';
import { computeTwinDelta } from '../domain/digital-twin.engine';
import { matchEdgeRules } from '../domain/edge-rule.engine';

describe('EIESDP Load — batch telemetry shape', () => {
  it('processes 10k telemetry payloads under 500ms', () => {
    const start = Date.now();
    const batch = Array.from({ length: 10_000 }, (_, i) => ({
      deviceKey: `sensor-${i % 500}`,
      metricKey: 'temperature',
      value: 20 + (i % 15),
    }));
    const aggregated = batch.reduce(
      (acc, row) => {
        acc.sum += row.value ?? 0;
        acc.count++;
        return acc;
      },
      { sum: 0, count: 0 },
    );
    expect(aggregated.count).toBe(10_000);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('evaluates 5k edge rules under 300ms', () => {
    const rules = Array.from({ length: 100 }, (_, i) => ({
      ruleKey: `rule-${i}`,
      conditions: { metricKey: 'temperature', operator: 'gt' as const, value: 25 + (i % 10) },
    }));
    const context = { temperature: 38 };
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      matchEdgeRules(rules, context);
    }
    expect(Date.now() - start).toBeLessThan(300);
  });

  it('computes 2k twin deltas under 200ms', () => {
    const desired = { threshold: 40, mode: 'auto', fanSpeed: 3 };
    const reported = { threshold: 35, mode: 'auto', fanSpeed: 2 };
    const start = Date.now();
    for (let i = 0; i < 2000; i++) {
      computeTwinDelta(desired, reported);
    }
    expect(Date.now() - start).toBeLessThan(200);
  });
});

describe('EIESDP catalog completeness', () => {
  it('includes all required device types', () => {
    const required = [
      'electronic_scale', 'temperature_sensor', 'humidity_sensor', 'soil_sensor',
      'ph_sensor', 'weather_station', 'gps_tracker', 'rfid_reader', 'nfc_reader',
      'ble_beacon', 'qr_scanner', 'barcode_scanner', 'ip_camera', 'drone',
      'industrial_controller', 'plc', 'actuator', 'energy_meter', 'custom_driver',
    ];
    for (const t of required) {
      expect(EIESDP_DEVICE_TYPES).toContain(t);
    }
  });

  it('includes all communication protocols', () => {
    const required = [
      'mqtt', 'http', 'https', 'tcp', 'udp', 'websocket', 'bluetooth', 'serial',
      'usb', 'modbus', 'opcua',
    ];
    for (const p of required) {
      expect(EIESDP_PROTOCOLS).toContain(p);
    }
  });
});
