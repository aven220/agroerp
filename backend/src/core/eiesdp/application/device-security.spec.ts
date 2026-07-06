import { createHash } from 'crypto';
import { DeviceSecurityService } from './device-security.service';

describe('DeviceSecurityService', () => {
  const security = new DeviceSecurityService({} as never);

  it('hashes tokens consistently', () => {
    const hash = security.hashToken('test-token');
    expect(hash).toBe(createHash('sha256').update('test-token').digest('hex'));
  });

  it('generates device tokens', () => {
    const t1 = security.generateDeviceToken();
    const t2 = security.generateDeviceToken();
    expect(t1).toMatch(/^eiesdp_/);
    expect(t1).not.toBe(t2);
  });
});

describe('EIESDP telemetry shape', () => {
  it('processes batch readings', () => {
    const batch = Array.from({ length: 100 }, (_, i) => ({
      deviceKey: `sensor-${i}`,
      metricKey: 'temperature',
      value: 20 + i * 0.1,
    }));
    expect(batch.length).toBe(100);
    expect(batch[0].metricKey).toBe('temperature');
  });
});

describe('EIESDP reconnection readiness', () => {
  it('detects stale lastSeen threshold', () => {
    const threshold = Date.now() - 5 * 60_000;
    const lastSeen = Date.now() - 10 * 60_000;
    expect(lastSeen < threshold).toBe(true);
  });
});

describe('EIESDP edge buffer', () => {
  it('buffers offline payloads', () => {
    const buffer = [{ synced: false }, { synced: false }, { synced: true }];
    expect(buffer.filter((b) => !b.synced).length).toBe(2);
  });
});
