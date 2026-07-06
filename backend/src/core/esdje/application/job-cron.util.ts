export function matchesCron(expression: string, date: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const [minute, hour, day, month, weekday] = parts;
  return (
    matchField(minute, date.getMinutes(), 0, 59) &&
    matchField(hour, date.getHours(), 0, 23) &&
    matchField(day, date.getDate(), 1, 31) &&
    matchField(month, date.getMonth() + 1, 1, 12) &&
    matchField(weekday, date.getDay(), 0, 6)
  );
}

export function nextCronRun(expression: string, from: Date): Date {
  const cursor = new Date(from.getTime() + 60_000);
  cursor.setSeconds(0, 0);
  for (let i = 0; i < 525_600; i++) {
    if (matchesCron(expression, cursor)) return new Date(cursor);
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return new Date(from.getTime() + 86_400_000);
}

function matchField(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;
  if (field.startsWith('*/')) {
    const step = Number(field.slice(2));
    return step > 0 && value % step === 0;
  }
  if (field.includes(',')) {
    return field.split(',').some((p) => matchField(p.trim(), value, min, max));
  }
  if (field.includes('-')) {
    const [a, b] = field.split('-').map(Number);
    return value >= a && value <= b;
  }
  return Number(field) === value;
}

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function isWithinAllowedHours(
  date: Date,
  hours?: { start: string; end: string },
): boolean {
  if (!hours?.start || !hours?.end) return true;
  const h = date.getHours();
  const start = parseInt(hours.start.split(':')[0], 10);
  const end = parseInt(hours.end.split(':')[0], 10);
  if (start <= end) return h >= start && h < end;
  return h >= start || h < end;
}
