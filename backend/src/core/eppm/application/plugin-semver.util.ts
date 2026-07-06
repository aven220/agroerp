export function parseSemver(version: string): [number, number, number] {
  const parts = version.replace(/^v/, '').split('.').map((p) => Number(p) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareSemver(a: string, b: string): number {
  const [ma, mi, pa] = parseSemver(a);
  const [mb, mj, pb] = parseSemver(b);
  if (ma !== mb) return ma - mb;
  if (mi !== mj) return mi - mj;
  return pa - pb;
}

export function satisfiesMinVersion(version: string, minVersion: string): boolean {
  return compareSemver(version, minVersion) >= 0;
}
