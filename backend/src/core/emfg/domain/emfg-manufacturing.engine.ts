export type EmfgBomLineInput = {
  componentKey: string;
  quantity: number;
  yieldPct?: number;
  scrapPct?: number;
};

export type EmfgCapacityWindow = {
  workCenterKey: string;
  startAt: Date;
  endAt: Date;
  loadMinutes: number;
  availableMinutes: number;
};

export type EmfgScheduleSlotInput = {
  scheduleKey: string;
  workCenterKey: string;
  startAt: Date;
  endAt: Date;
  loadMinutes: number;
};

export function generateEmfgKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export function roundQty(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function computeComponentQty(
  orderQty: number,
  lineQty: number,
  bomYieldPct = 100,
  lineYieldPct = 100,
  scrapPct = 0,
): number {
  const yieldFactor = (bomYieldPct / 100) * (lineYieldPct / 100);
  const base = yieldFactor > 0 ? (orderQty * lineQty) / yieldFactor : orderQty * lineQty;
  return roundQty(base * (1 + scrapPct / 100));
}

export function computeOperationMinutes(
  plannedQty: number,
  setupMinutes: number,
  runMinutesPerUnit: number,
): number {
  return roundQty(setupMinutes + plannedQty * runMinutesPerUnit, 2);
}

export function computeAvailableCapacity(installed: number, scheduledLoad: number): number {
  return roundQty(Math.max(0, installed - scheduledLoad), 2);
}

export function computeCapacityLoadFactor(scheduledLoad: number, installed: number): number {
  if (installed <= 0) return scheduledLoad > 0 ? 999 : 0;
  return roundQty((scheduledLoad / installed) * 100, 2);
}

export function isCapacityOverloaded(loadFactor: number, threshold = 100): boolean {
  return loadFactor > threshold;
}

export function slotsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function detectScheduleConflicts(
  slots: EmfgScheduleSlotInput[],
  capacityByCenter: Record<string, number>,
): Array<{ conflictType: 'overlap' | 'capacity_overload'; workCenterKey: string; scheduleKey: string; message: string; severity: number }> {
  const conflicts: Array<{ conflictType: 'overlap' | 'capacity_overload'; workCenterKey: string; scheduleKey: string; message: string; severity: number }> = [];
  const byCenter = new Map<string, EmfgScheduleSlotInput[]>();

  for (const slot of slots) {
    const list = byCenter.get(slot.workCenterKey) ?? [];
    list.push(slot);
    byCenter.set(slot.workCenterKey, list);
  }

  for (const [workCenterKey, centerSlots] of byCenter) {
    const sorted = [...centerSlots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (slotsOverlap(sorted[i].startAt, sorted[i].endAt, sorted[j].startAt, sorted[j].endAt)) {
          conflicts.push({
            conflictType: 'overlap',
            workCenterKey,
            scheduleKey: sorted[j].scheduleKey,
            message: `Solapamiento entre ${sorted[i].scheduleKey} y ${sorted[j].scheduleKey}`,
            severity: 2,
          });
        }
      }
    }

    const totalLoad = centerSlots.reduce((s, x) => s + x.loadMinutes, 0);
    const installed = capacityByCenter[workCenterKey] ?? 0;
    const loadFactor = computeCapacityLoadFactor(totalLoad, installed);
    if (isCapacityOverloaded(loadFactor)) {
      conflicts.push({
        conflictType: 'capacity_overload',
        workCenterKey,
        scheduleKey: centerSlots[0]?.scheduleKey ?? 'unknown',
        message: `Sobrecarga ${loadFactor}% en centro ${workCenterKey}`,
        severity: 3,
      });
    }
  }

  return conflicts;
}

export function autoScheduleOperations(
  operations: Array<{ orderOpKey: string; workCenterKey: string; runMinutes: number; sequence: number }>,
  horizonStart: Date,
): Array<{ orderOpKey: string; workCenterKey: string; startAt: Date; endAt: Date; loadMinutes: number }> {
  const result: Array<{ orderOpKey: string; workCenterKey: string; startAt: Date; endAt: Date; loadMinutes: number }> = [];
  const cursorByCenter = new Map<string, Date>();

  const sorted = [...operations].sort((a, b) => a.sequence - b.sequence);
  for (const op of sorted) {
    const cursor = cursorByCenter.get(op.workCenterKey) ?? new Date(horizonStart);
    const startAt = new Date(cursor);
    const endAt = new Date(startAt.getTime() + op.runMinutes * 60_000);
    result.push({ orderOpKey: op.orderOpKey, workCenterKey: op.workCenterKey, startAt, endAt, loadMinutes: op.runMinutes });
    cursorByCenter.set(op.workCenterKey, endAt);
  }
  return result;
}

export function validateOrderRelease(status: string, plannedQty: number, materialCount: number): string[] {
  const errors: string[] = [];
  if (!['draft', 'planned'].includes(status)) errors.push('invalid_status');
  if (plannedQty <= 0) errors.push('invalid_quantity');
  if (materialCount === 0) errors.push('missing_materials');
  return errors;
}

export function canTransitionOrderStatus(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    draft: ['planned', 'cancelled'],
    planned: ['released', 'draft', 'cancelled'],
    released: ['in_progress', 'planned', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: ['closed'],
    closed: [],
    cancelled: [],
  };
  return (allowed[from] ?? []).includes(to);
}

export function applySubstitutionQty(baseQty: number, factor: number): number {
  return roundQty(baseQty * factor);
}

export function horizonEndFromDays(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end;
}

export const DEFAULT_EMFG_CALENDAR_DAYS = [
  { dayOfWeek: 1, startTime: '06:00', endTime: '18:00', availableHours: 12, isWorking: true },
  { dayOfWeek: 2, startTime: '06:00', endTime: '18:00', availableHours: 12, isWorking: true },
  { dayOfWeek: 3, startTime: '06:00', endTime: '18:00', availableHours: 12, isWorking: true },
  { dayOfWeek: 4, startTime: '06:00', endTime: '18:00', availableHours: 12, isWorking: true },
  { dayOfWeek: 5, startTime: '06:00', endTime: '18:00', availableHours: 12, isWorking: true },
  { dayOfWeek: 6, startTime: '06:00', endTime: '14:00', availableHours: 8, isWorking: true },
  { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', availableHours: 0, isWorking: false },
];

export const DEFAULT_EMFG_CENTER = {
  code: 'PLT-01',
  name: 'Planta Principal',
  installedCapacity: 480,
  availableCapacity: 480,
};

export const DEFAULT_EMFG_BOM_LINES: EmfgBomLineInput[] = [
  { componentKey: 'RM-COFFEE-001', quantity: 1.2, yieldPct: 98, scrapPct: 2 },
  { componentKey: 'RM-BAG-001', quantity: 1, yieldPct: 100, scrapPct: 0 },
];
