/**
 * PM-05 — Persistencia de comandos (solo localStorage).
 */

export interface CommandHistoryEntry {
  commandId: string;
  executedAt: string;
}

function storageKey(userId: string | undefined, suffix: string) {
  return `agroerp_cmd_${suffix}_${userId ?? 'anon'}`;
}

export function loadRecentCommandIds(userId: string | undefined, limit = 12): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, 'recent'));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommandHistoryEntry[];
    return parsed.slice(0, limit).map((e) => e.commandId);
  } catch {
    return [];
  }
}

export function recordCommandExecution(userId: string | undefined, commandId: string): string[] {
  const entry: CommandHistoryEntry = { commandId, executedAt: new Date().toISOString() };
  const prev = loadRecentCommandIds(userId, 24).map((id) => ({
    commandId: id,
    executedAt: new Date().toISOString(),
  }));
  const next = [entry, ...prev.filter((e) => e.commandId !== commandId)].slice(0, 24);
  localStorage.setItem(storageKey(userId, 'recent'), JSON.stringify(next));
  return next.slice(0, 12).map((e) => e.commandId);
}

export function loadFavoriteCommandIds(userId: string | undefined): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, 'favorites'));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteCommandId(userId: string | undefined, commandId: string): string[] {
  const prev = loadFavoriteCommandIds(userId);
  const next = prev.includes(commandId)
    ? prev.filter((id) => id !== commandId)
    : [commandId, ...prev].slice(0, 24);
  localStorage.setItem(storageKey(userId, 'favorites'), JSON.stringify(next));
  return next;
}

export type CommandPaletteMode = 'launcher' | 'commands';

export function loadPaletteMode(): CommandPaletteMode {
  return 'launcher';
}
