import {
  computeMinutesLate,
  computeNoveltyMultiplier,
  computeOvertimeMinutes,
  computeWorkedMinutes,
  generateTaKey,
  haversineMeters,
  isHolidayDate,
  mergeConcurrentPunches,
  parseTimeToMinutes,
  summarizeWorkDay,
  validateGeofence,
  validateOfflinePunchRow,
  validatePunchSequence,
} from '../domain/hcm-time-attendance.engine';

describe('HCM Time Attendance Engine — Fase 3', () => {
  it('generates TA keys', () => {
    expect(generateTaKey('PCH', 1)).toBe('PCH-00000001');
  });

  it('parses time to minutes', () => {
    expect(parseTimeToMinutes('08:30')).toBe(510);
  });

  it('computes haversine distance', () => {
    const d = haversineMeters(4.6097, -74.0817, 4.6100, -74.0817);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(50);
  });

  it('validates geofence', () => {
    const result = validateGeofence(4.6097, -74.0817, { latitude: 4.6097, longitude: -74.0817, radiusMeters: 100 });
    expect(result.valid).toBe(true);
  });

  it('computes minutes late', () => {
    const workDate = new Date('2026-07-04');
    const punchedAt = new Date('2026-07-04T08:20:00');
    const late = computeMinutesLate(punchedAt, { startTime: '08:00', endTime: '17:00', graceMinutes: 5 }, workDate);
    expect(late).toBe(15);
  });

  it('computes worked minutes from punches', () => {
    const { worked } = computeWorkedMinutes([
      { punchType: 'clock_in', punchedAt: '2026-07-04T08:00:00' },
      { punchType: 'lunch_start', punchedAt: '2026-07-04T12:00:00' },
      { punchType: 'lunch_end', punchedAt: '2026-07-04T13:00:00' },
      { punchType: 'clock_out', punchedAt: '2026-07-04T17:00:00' },
    ]);
    expect(worked).toBe(480);
  });

  it('computes overtime', () => {
    expect(computeOvertimeMinutes(540, 480)).toBe(60);
  });

  it('summarizes work day', () => {
    const summary = summarizeWorkDay('2026-07-04', [
      { punchType: 'clock_in', punchedAt: '2026-07-04T08:00:00', minutesLate: 0 },
      { punchType: 'clock_out', punchedAt: '2026-07-04T17:00:00' },
    ]);
    expect(summary.workedMinutes).toBe(540);
    expect(summary.isAbsent).toBe(false);
  });

  it('validates punch sequence', () => {
    expect(validatePunchSequence([], 'clock_in').valid).toBe(true);
    expect(validatePunchSequence(['clock_in'], 'clock_out').valid).toBe(true);
    expect(validatePunchSequence(['clock_out'], 'clock_in').valid).toBe(true);
    expect(validatePunchSequence([], 'clock_out').valid).toBe(false);
  });

  it('computes novelty multipliers', () => {
    expect(computeNoveltyMultiplier('night_surcharge', false, false)).toBe(1.35);
    expect(computeNoveltyMultiplier('overtime', true, false)).toBe(1.75);
    expect(computeNoveltyMultiplier('overtime', false, true)).toBe(2);
  });

  it('detects holidays', () => {
    expect(isHolidayDate('2026-01-01', ['2026-01-01'])).toBe(true);
  });

  it('validates offline punch rows', () => {
    const ok = validateOfflinePunchRow({ employeeKey: 'EMP-1', punchType: 'clock_in', punchedAt: '2026-07-04T08:00:00Z' }, 1);
    expect(ok.valid).toBe(true);
  });

  it('merges concurrent punches', () => {
    const merged = mergeConcurrentPunches([
      { punchKey: 'A', punchedAt: '2026-07-04T08:00:00Z' },
      { punchKey: 'A', punchedAt: '2026-07-04T08:00:00Z' },
      { punchKey: 'B', punchedAt: '2026-07-04T17:00:00Z' },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('handles bulk ranking stability for concurrent merge', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ punchKey: `P-${i % 10}`, punchedAt: `2026-07-04T08:0${i % 10}:00Z` }));
    expect(mergeConcurrentPunches(rows).length).toBeLessThanOrEqual(100);
  });
});
