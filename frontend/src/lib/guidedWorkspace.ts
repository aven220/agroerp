/**
 * PM-03 — Espacio de trabajo guiado (solo localStorage / sessionStorage).
 */

import type { WorkEntityKind } from './workEntityHistory';
import { kindIcon, loadWorkEntityHistory } from './workEntityHistory';

export type GuidedRecordKind =
  | WorkEntityKind
  | 'workflow'
  | 'customer'
  | 'supplier';

export interface GuidedPinnedRecord {
  id: string;
  kind: GuidedRecordKind;
  label: string;
  to: string;
  pinnedAt: string;
  note?: string;
}

export interface GuidedPersonalTask {
  id: string;
  label: string;
  to?: string;
  done: boolean;
  createdAt: string;
}

export interface GuidedPersonalShortcut {
  id: string;
  label: string;
  to: string;
  icon: string;
  order: number;
}

export interface GuidedWorkingSet {
  id: string;
  name: string;
  items: GuidedPinnedRecord[];
  updatedAt: string;
}

export interface GuidedQuickNote {
  id: string;
  text: string;
  createdAt: string;
  entityLabel?: string;
}

export interface GuidedOpenProcess {
  id: string;
  label: string;
  to: string;
  openedAt: string;
}

const EXTRA_KIND_ICONS: Record<'workflow' | 'customer' | 'supplier', string> = {
  workflow: '✅',
  customer: '🏢',
  supplier: '🚚',
};

export function guidedRecordIcon(kind: GuidedRecordKind): string {
  if (kind in EXTRA_KIND_ICONS) {
    return EXTRA_KIND_ICONS[kind as keyof typeof EXTRA_KIND_ICONS];
  }
  return kindIcon(kind as WorkEntityKind);
}

function lsKey(userId: string | undefined, key: string) {
  return `agroerp_gw_${key}_${userId ?? 'anon'}`;
}

function readJson<T>(userId: string | undefined, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(lsKey(userId, key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(userId: string | undefined, key: string, value: T) {
  localStorage.setItem(lsKey(userId, key), JSON.stringify(value));
}

/* ─── Panel abierto/cerrado ─── */
export function loadPanelOpen(userId: string | undefined): boolean {
  return readJson(userId, 'panel_open', false);
}

export function savePanelOpen(userId: string | undefined, open: boolean) {
  writeJson(userId, 'panel_open', open);
}

/* ─── Registros fijados ─── */
export function loadPinnedRecords(userId: string | undefined): GuidedPinnedRecord[] {
  return readJson(userId, 'pinned', []);
}

export function savePinnedRecords(userId: string | undefined, items: GuidedPinnedRecord[]) {
  writeJson(userId, 'pinned', items.slice(0, 48));
}

export function pinRecord(
  userId: string | undefined,
  record: Omit<GuidedPinnedRecord, 'pinnedAt'>,
): GuidedPinnedRecord[] {
  const entry: GuidedPinnedRecord = { ...record, pinnedAt: new Date().toISOString() };
  const prev = loadPinnedRecords(userId);
  const next = [entry, ...prev.filter((p) => !(p.kind === entry.kind && p.id === entry.id))];
  savePinnedRecords(userId, next);
  return next;
}

export function unpinRecord(userId: string | undefined, kind: GuidedRecordKind, id: string): GuidedPinnedRecord[] {
  const next = loadPinnedRecords(userId).filter((p) => !(p.kind === kind && p.id === id));
  savePinnedRecords(userId, next);
  return next;
}

export function isRecordPinned(userId: string | undefined, kind: GuidedRecordKind, id: string): boolean {
  return loadPinnedRecords(userId).some((p) => p.kind === kind && p.id === id);
}

/* ─── Tareas personales ─── */
export function loadPersonalTasks(userId: string | undefined): GuidedPersonalTask[] {
  return readJson(userId, 'tasks', []);
}

export function savePersonalTasks(userId: string | undefined, tasks: GuidedPersonalTask[]) {
  writeJson(userId, 'tasks', tasks.slice(0, 40));
}

export function addPersonalTask(userId: string | undefined, label: string, to?: string): GuidedPersonalTask[] {
  const task: GuidedPersonalTask = {
    id: `task-${Date.now()}`,
    label: label.trim(),
    to,
    done: false,
    createdAt: new Date().toISOString(),
  };
  const next = [task, ...loadPersonalTasks(userId)];
  savePersonalTasks(userId, next);
  return next;
}

export function togglePersonalTask(userId: string | undefined, id: string): GuidedPersonalTask[] {
  const next = loadPersonalTasks(userId).map((t) =>
    t.id === id ? { ...t, done: !t.done } : t,
  );
  savePersonalTasks(userId, next);
  return next;
}

export function removePersonalTask(userId: string | undefined, id: string): GuidedPersonalTask[] {
  const next = loadPersonalTasks(userId).filter((t) => t.id !== id);
  savePersonalTasks(userId, next);
  return next;
}

/* ─── Accesos rápidos personales ─── */
export function loadPersonalShortcuts(userId: string | undefined): GuidedPersonalShortcut[] {
  return readJson(userId, 'shortcuts', []);
}

export function savePersonalShortcuts(userId: string | undefined, items: GuidedPersonalShortcut[]) {
  writeJson(userId, 'shortcuts', items.slice(0, 20));
}

export function addPersonalShortcut(
  userId: string | undefined,
  label: string,
  to: string,
  icon = '🔗',
): GuidedPersonalShortcut[] {
  const items = loadPersonalShortcuts(userId);
  const entry: GuidedPersonalShortcut = {
    id: `sc-${Date.now()}`,
    label: label.trim(),
    to,
    icon,
    order: items.length,
  };
  const next = [...items, entry];
  savePersonalShortcuts(userId, next);
  return next;
}

export function removePersonalShortcut(userId: string | undefined, id: string): GuidedPersonalShortcut[] {
  const next = loadPersonalShortcuts(userId).filter((s) => s.id !== id);
  savePersonalShortcuts(userId, next);
  return next;
}

/* ─── Notas rápidas ─── */
export function loadQuickNotes(userId: string | undefined): GuidedQuickNote[] {
  return readJson(userId, 'notes', []);
}

export function saveQuickNotes(userId: string | undefined, notes: GuidedQuickNote[]) {
  writeJson(userId, 'notes', notes.slice(0, 30));
}

export function addQuickNote(userId: string | undefined, text: string, entityLabel?: string): GuidedQuickNote[] {
  const note: GuidedQuickNote = {
    id: `note-${Date.now()}`,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    entityLabel,
  };
  const next = [note, ...loadQuickNotes(userId)];
  saveQuickNotes(userId, next);
  return next;
}

export function removeQuickNote(userId: string | undefined, id: string): GuidedQuickNote[] {
  const next = loadQuickNotes(userId).filter((n) => n.id !== id);
  saveQuickNotes(userId, next);
  return next;
}

/* ─── Conjuntos de trabajo ─── */
export function loadWorkingSets(userId: string | undefined): GuidedWorkingSet[] {
  return readJson(userId, 'working_sets', []);
}

export function saveWorkingSet(
  userId: string | undefined,
  name: string,
  items: GuidedPinnedRecord[],
): GuidedWorkingSet[] {
  const set: GuidedWorkingSet = {
    id: `ws-${Date.now()}`,
    name: name.trim(),
    items: [...items],
    updatedAt: new Date().toISOString(),
  };
  const next = [set, ...loadWorkingSets(userId)].slice(0, 12);
  writeJson(userId, 'working_sets', next);
  return next;
}

export function removeWorkingSet(userId: string | undefined, id: string): GuidedWorkingSet[] {
  const next = loadWorkingSets(userId).filter((s) => s.id !== id);
  writeJson(userId, 'working_sets', next);
  return next;
}

export function restoreWorkingSet(userId: string | undefined, setId: string): GuidedPinnedRecord[] {
  const set = loadWorkingSets(userId).find((s) => s.id === setId);
  if (!set) return loadPinnedRecords(userId);
  const merged = [...set.items];
  for (const p of loadPinnedRecords(userId)) {
    if (!merged.some((m) => m.kind === p.kind && m.id === p.id)) merged.push(p);
  }
  savePinnedRecords(userId, merged);
  return merged;
}

/* ─── Procesos abiertos (sesión) ─── */
function sessionKey(userId: string | undefined) {
  return `agroerp_gw_open_${userId ?? 'anon'}`;
}

export function loadOpenProcesses(userId: string | undefined): GuidedOpenProcess[] {
  try {
    const raw = sessionStorage.getItem(sessionKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as GuidedOpenProcess[];
  } catch {
    return [];
  }
}

export function recordOpenProcess(
  userId: string | undefined,
  proc: Omit<GuidedOpenProcess, 'openedAt'>,
): GuidedOpenProcess[] {
  const entry: GuidedOpenProcess = { ...proc, openedAt: new Date().toISOString() };
  const next = [entry, ...loadOpenProcesses(userId).filter((p) => p.id !== entry.id)].slice(0, 8);
  sessionStorage.setItem(sessionKey(userId), JSON.stringify(next));
  return next;
}

export function removeOpenProcess(userId: string | undefined, id: string): GuidedOpenProcess[] {
  const next = loadOpenProcesses(userId).filter((p) => p.id !== id);
  sessionStorage.setItem(sessionKey(userId), JSON.stringify(next));
  return next;
}

/* ─── Recientes (delegado a workEntityHistory) ─── */
export { getContinueWorkItems, loadWorkEntityHistory as getRecentRecords } from './workEntityHistory';

export function visitToPinned(visit: import('./workEntityHistory').WorkEntityVisit): GuidedPinnedRecord {
  return {
    id: visit.id,
    kind: visit.kind,
    label: visit.label,
    to: visit.to,
    pinnedAt: new Date().toISOString(),
  };
}
