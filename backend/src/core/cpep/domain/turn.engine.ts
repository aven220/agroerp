export type TurnSortable = {
  turnNumber: number;
  priority: number;
  isPreferential: boolean;
  createdAt: Date;
};

export function sortQueue<T extends TurnSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.isPreferential !== b.isPreferential) return a.isPreferential ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.turnNumber !== b.turnNumber) return a.turnNumber - b.turnNumber;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function computeWaitMs(arrivalAt: Date | null | undefined, calledAt: Date | null | undefined): number | null {
  if (!arrivalAt || !calledAt) return null;
  return Math.max(0, calledAt.getTime() - arrivalAt.getTime());
}

export function computeAttentionMs(startedAt: Date | null | undefined, completedAt: Date | null | undefined): number | null {
  if (!startedAt || !completedAt) return null;
  return Math.max(0, completedAt.getTime() - startedAt.getTime());
}

export function averageMs(values: Array<number | null | undefined>): number {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function displayLabel(turnNumber: number, isPreferential: boolean): string {
  return isPreferential ? `P-${turnNumber}` : `T-${turnNumber}`;
}
