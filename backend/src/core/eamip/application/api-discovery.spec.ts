import { ApiDiscoveryService } from './api-discovery.service';

describe('ApiDiscoveryService', () => {
  const discovery = new ApiDiscoveryService();

  it('discovers internal modules', () => {
    const services = discovery.discover();
    expect(services.length).toBeGreaterThan(5);
    expect(services.some((s) => s.moduleRef === 'prm')).toBe(true);
    expect(services.some((s) => s.moduleRef === 'eaidsp')).toBe(true);
  });

  it('finds module by ref', () => {
    const prm = discovery.findByModule('prm');
    expect(prm?.basePath).toContain('/prm');
  });
});
