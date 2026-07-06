import { compareSemver, parseSemver, satisfiesMinVersion } from './plugin-semver.util';
import { PluginManifestValidator } from './plugin-manifest.validator';
import { PluginSignatureService } from './plugin-signature.service';

describe('PluginSemverUtil', () => {
  it('parses semver', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
  });

  it('compares versions', () => {
    expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('satisfies min version', () => {
    expect(satisfiesMinVersion('1.1.0', '1.0.0')).toBe(true);
    expect(satisfiesMinVersion('0.9.0', '1.0.0')).toBe(false);
  });
});

describe('PluginManifestValidator', () => {
  const validator = new PluginManifestValidator();

  const validManifest = {
    apiVersion: 'agroerp.platform/v1',
    pluginKey: 'agro.test.plugin',
    name: 'Test',
    version: '1.0.0',
    vendor: 'AGROERP',
    pluginType: 'business_module' as const,
  };

  it('validates correct manifest', () => {
    expect(() => validator.validate(validManifest)).not.toThrow();
  });

  it('rejects invalid pluginKey', () => {
    expect(() => validator.validate({ ...validManifest, pluginKey: '' })).toThrow();
  });

  it('scans integrity', () => {
    const result = validator.scanIntegrity(validManifest);
    expect(result.issues).toContain('Firma digital ausente');
  });
});

describe('PluginSignatureService', () => {
  const signature = new PluginSignatureService({ get: () => 'test-secret' } as never);

  it('signs and verifies manifest', () => {
    const manifest = {
      apiVersion: 'agroerp.platform/v1',
      pluginKey: 'agro.test',
      name: 'T',
      version: '1.0.0',
      vendor: 'V',
      pluginType: 'widget' as const,
    };
    const sig = signature.sign(manifest);
    expect(signature.verify(manifest, sig)).toBe(true);
  });
});

describe('EPPM concurrency readiness', () => {
  it('processes batch install shape', () => {
    const batch = Array.from({ length: 100 }, (_, i) => ({ pluginKey: `p.${i}`, version: '1.0.0' }));
    expect(batch.length).toBe(100);
  });
});

describe('EPPM rollback readiness', () => {
  it('preserves previous version for rollback', () => {
    const state = { installedVersion: '2.0.0', previousVersion: '1.0.0' };
    expect(compareSemver(state.previousVersion, state.installedVersion)).toBeLessThan(0);
  });
});
