import { ApiSecurityService } from './api-security.service';

describe('EAMIP Security', () => {
  const service = new ApiSecurityService({} as never);

  it('detects abuse patterns', () => {
    expect(service.detectAbuse(['<script>alert(1)</script>'])).toBe(true);
    expect(service.detectAbuse(['/producers'])).toBe(false);
  });

  it('sanitizes control characters', () => {
    expect(service.sanitizeInput('hello\x00world')).toBe('helloworld');
  });

  it('asserts scopes', () => {
    expect(() => service.assertScope(['prm:read'], 'prm:read')).not.toThrow();
    expect(() => service.assertScope(['*'], 'any:scope')).not.toThrow();
    expect(() => service.assertScope(['other:read'], 'prm:read')).toThrow();
  });
});
