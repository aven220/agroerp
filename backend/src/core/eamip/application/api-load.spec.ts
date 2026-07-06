import { ApiRetryPolicyService } from './api-retry-policy.service';

describe('EAMIP Load — retry policy throughput', () => {
  const service = new ApiRetryPolicyService();

  it('handles 200 concurrent successful calls', async () => {
    const batch = Array.from({ length: 200 }, () =>
      service.execute(async () => 'ok', 0, 1000),
    );
    const results = await Promise.all(batch);
    expect(results.every((r) => r === 'ok')).toBe(true);
  });
});
