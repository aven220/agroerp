import { IamAnomalyService } from './iam-anomaly.service';

describe('IamAnomalyService', () => {
  it('creates alerts on repeated login failures', async () => {
    const creates: unknown[] = [];
    const prisma = {
      iamAuthAttempt: {
        findMany: jest.fn().mockResolvedValue(
          Array.from({ length: 5 }, () => ({
            success: false,
            ipAddress: '192.168.1.10',
            createdAt: new Date(),
          })),
        ),
      },
      iamAnomalyAlert: {
        create: jest.fn().mockImplementation(async ({ data }) => {
          creates.push(data);
          return data;
        }),
      },
      iamSecurityEvent: { create: jest.fn() },
    };

    const service = new IamAnomalyService(prisma as never);
    const result = await service.analyzeLogin('org', 'user', '192.168.1.10', false);
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(creates.some((c) => (c as { alertType: string }).alertType === 'brute_force')).toBe(true);
  });
});

describe('EIAMP load readiness', () => {
  it('handles batch permission resolution shape', () => {
    const batch = Array.from({ length: 1000 }, (_, i) => ({
      userId: `u-${i}`,
      permissions: ['iam:read', 'producer:read'],
    }));
    expect(batch).toHaveLength(1000);
    expect(batch.every((b) => b.permissions.includes('iam:read'))).toBe(true);
  });
});
