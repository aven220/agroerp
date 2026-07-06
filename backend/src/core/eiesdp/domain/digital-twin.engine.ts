export function computeTwinDelta(
  desired: Record<string, unknown>,
  reported: Record<string, unknown>,
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  for (const key of Object.keys(desired)) {
    if (JSON.stringify(desired[key]) !== JSON.stringify(reported[key])) {
      delta[key] = desired[key];
    }
  }
  return delta;
}
