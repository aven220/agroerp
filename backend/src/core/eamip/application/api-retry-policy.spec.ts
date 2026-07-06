import { ApiRetryPolicyService } from './api-retry-policy.service';

describe('ApiRetryPolicyService', () => {
  const service = new ApiRetryPolicyService();

  it('retries on failure', async () => {
    let calls = 0;
    const result = await service.execute(async () => {
      calls++;
      if (calls < 2) throw new Error('fail');
      return 'ok';
    }, 2, 5000);
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('throws after retries exhausted', async () => {
    await expect(
      service.execute(async () => { throw new Error('always'); }, 1, 5000),
    ).rejects.toThrow('always');
  });
});
