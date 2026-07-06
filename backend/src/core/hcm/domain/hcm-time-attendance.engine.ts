export type ShiftWindow = {
  startTime: string;
  endTime: string;
  crossesMidnight?: boolean;
  graceMinutes?: number;
};

export type GeofencePoint = { latitude: number; longitude: number; radiusMeters: number };

export type PunchRecord = {
  punchType: string;
  punchedAt: Date | string;
  minutesLate?: number | null;
};

export type WorkDaySummary = {
  workDate: string;
  clockIn?: Date;
  clockOut?: Date;
  punches: PunchRecord[];
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  isLate: boolean;
  isAbsent: boolean;
};

export const DEFAULT_TA_SHIFTS = [
  { code: 'DAY', name: 'Turno diurno', shiftType: 'fixed', startTime: '06:00', endTime: '14:00', breakMinutes: 15, lunchMinutes: 60 },
  { code: 'EVE', name: 'Turno tarde', shiftType: 'fixed', startTime: '14:00', endTime: '22:00', breakMinutes: 15, lunchMinutes: 60 },
  { code: 'NIGHT', name: 'Turno nocturno', shiftType: 'night', startTime: '22:00', endTime: '06:00', breakMinutes: 15, lunchMinutes: 30, crossesMidnight: true },
] as const;

export const DEFAULT_TA_SCHEDULES = [
  { scheduleKey: 'STD-48', name: 'Jornada estándar 48h', workMode: 'onsite', weeklyHours: 48, dailyHours: 8 },
  { scheduleKey: 'FLEX-40', name: 'Tiempo flexible 40h', workMode: 'hybrid', weeklyHours: 40, dailyHours: 8, flexibleStart: true, flexWindowMinutes: 60 },
  { scheduleKey: 'FIELD', name: 'Trabajo en campo', workMode: 'field', weeklyHours: 48, dailyHours: 8 },
  { scheduleKey: 'REMOTE', name: 'Trabajo remoto', workMode: 'remote', weeklyHours: 40, dailyHours: 8 },
] as const;

export function generateTaKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGeofence(lat: number, lon: number, fence: GeofencePoint): { valid: boolean; distanceMeters: number } {
  const distanceMeters = haversineMeters(lat, lon, fence.latitude, fence.longitude);
  return { valid: distanceMeters <= fence.radiusMeters, distanceMeters: Math.round(distanceMeters) };
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveWorkDateKey(workDate: Date): string {
  if (
    workDate.getUTCHours() === 0 &&
    workDate.getUTCMinutes() === 0 &&
    workDate.getUTCSeconds() === 0 &&
    workDate.getUTCMilliseconds() === 0
  ) {
    return workDate.toISOString().slice(0, 10);
  }
  return toLocalDateKey(workDate);
}

export function computeMinutesLate(punchedAt: Date, shift: ShiftWindow, workDate: Date): number {
  const expected = parseTimeToMinutes(shift.startTime);
  const grace = shift.graceMinutes ?? 0;
  const punchMin = punchedAt.getHours() * 60 + punchedAt.getMinutes();
  const workKey = resolveWorkDateKey(workDate);
  const punchKey = toLocalDateKey(punchedAt);

  let base = punchMin;
  if (punchKey === workKey) {
    base = punchMin;
  } else if (shift.crossesMidnight) {
    const next = new Date(`${workKey}T12:00:00`);
    next.setDate(next.getDate() + 1);
    if (punchKey === toLocalDateKey(next)) base = punchMin + 1440;
  }

  const late = base - expected - grace;
  return Math.max(0, late);
}

export function computeWorkedMinutes(punches: PunchRecord[]): { worked: number; break: number } {
  const sorted = [...punches].sort((a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime());
  let worked = 0;
  let breakMin = 0;
  let clockIn: Date | null = null;
  let breakStart: Date | null = null;

  for (const p of sorted) {
    const at = new Date(p.punchedAt);
    switch (p.punchType) {
      case 'clock_in':
        clockIn = at;
        break;
      case 'clock_out':
        if (clockIn) worked += (at.getTime() - clockIn.getTime()) / 60000;
        clockIn = null;
        break;
      case 'break_start':
      case 'lunch_start':
        breakStart = at;
        if (clockIn) worked += (at.getTime() - clockIn.getTime()) / 60000;
        clockIn = null;
        break;
      case 'break_end':
      case 'lunch_end':
        if (breakStart) breakMin += (at.getTime() - breakStart.getTime()) / 60000;
        breakStart = null;
        clockIn = at;
        break;
      default:
        break;
    }
  }
  return { worked: Math.round(worked), break: Math.round(breakMin) };
}

export function computeOvertimeMinutes(workedMinutes: number, scheduledMinutes: number): number {
  return Math.max(0, workedMinutes - scheduledMinutes);
}

export function summarizeWorkDay(workDate: string, punches: PunchRecord[], scheduledMinutes = 480): WorkDaySummary {
  const { worked, break: breakMinutes } = computeWorkedMinutes(punches);
  const clockIn = punches.find((p) => p.punchType === 'clock_in');
  const clockOut = [...punches].reverse().find((p) => p.punchType === 'clock_out');
  const isLate = punches.some((p) => (p.minutesLate ?? 0) > 0);
  const isAbsent = !clockIn && punches.length === 0;
  return {
    workDate,
    clockIn: clockIn ? new Date(clockIn.punchedAt) : undefined,
    clockOut: clockOut ? new Date(clockOut.punchedAt) : undefined,
    punches,
    workedMinutes: worked,
    breakMinutes,
    overtimeMinutes: computeOvertimeMinutes(worked, scheduledMinutes),
    isLate,
    isAbsent,
  };
}

export function validatePunchSequence(existing: string[], nextType: string): { valid: boolean; reason?: string } {
  const last = existing[existing.length - 1];
  if (!last && nextType !== 'clock_in') return { valid: false, reason: 'Primera marcación debe ser entrada' };
  if (last === 'clock_in' && !['clock_out', 'break_start', 'lunch_start'].includes(nextType)) {
    return { valid: false, reason: 'Secuencia inválida tras entrada' };
  }
  if (last === 'clock_out' && nextType !== 'clock_in') return { valid: false, reason: 'Tras salida solo se permite nueva entrada' };
  return { valid: true };
}

export function isHolidayDate(date: string, holidays: string[]): boolean {
  return holidays.includes(date.slice(0, 10));
}

export function computeNoveltyMultiplier(type: string, isSunday: boolean, isHoliday: boolean): number {
  if (type === 'night_surcharge') return 1.35;
  if (type === 'sunday_surcharge' || (isSunday && type === 'overtime')) return 1.75;
  if (type === 'holiday_surcharge' || (isHoliday && type === 'overtime')) return 2.0;
  if (type === 'overtime') return 1.25;
  return 1;
}

export function validateOfflinePunchRow(row: {
  employeeKey: string; punchType: string; punchedAt: string;
}, rowIndex: number): { valid: boolean; errors: string[]; row: number } {
  const errors: string[] = [];
  if (!row.employeeKey?.trim()) errors.push('Empleado requerido');
  if (!row.punchType?.trim()) errors.push('Tipo marcación requerido');
  if (!row.punchedAt?.trim() || Number.isNaN(Date.parse(row.punchedAt))) errors.push('Fecha/hora inválida');
  return { row: rowIndex, valid: errors.length === 0, errors };
}

export function mergeConcurrentPunches(rows: Array<{ punchKey: string; punchedAt: string }>): Array<{ punchKey: string; punchedAt: string }> {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.punchKey}:${r.punchedAt}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
