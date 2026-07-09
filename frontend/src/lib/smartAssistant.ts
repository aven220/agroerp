/**
 * PM-06 — Persistencia del asistente inteligente (solo localStorage / sessionStorage).
 */

export interface DismissedSuggestion {
  id: string;
  dismissedAt: string;
}

export interface ModuleVisitRecord {
  path: string;
  visitedAt: string;
  count: number;
}

function lsKey(userId: string | undefined, key: string) {
  return `agroerp_assistant_${key}_${userId ?? 'anon'}`;
}

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function loadDismissedSuggestions(userId: string | undefined): DismissedSuggestion[] {
  try {
    const raw = localStorage.getItem(lsKey(userId, 'dismissed'));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DismissedSuggestion[];
    const cutoff = Date.now() - DISMISS_TTL_MS;
    return parsed.filter((d) => new Date(d.dismissedAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

export function dismissSuggestion(userId: string | undefined, id: string): DismissedSuggestion[] {
  const prev = loadDismissedSuggestions(userId).filter((d) => d.id !== id);
  const next = [{ id, dismissedAt: new Date().toISOString() }, ...prev].slice(0, 48);
  localStorage.setItem(lsKey(userId, 'dismissed'), JSON.stringify(next));
  return next;
}

export function loadVisitedModules(userId: string | undefined): ModuleVisitRecord[] {
  try {
    const raw = localStorage.getItem(lsKey(userId, 'modules'));
    if (!raw) return [];
    return JSON.parse(raw) as ModuleVisitRecord[];
  } catch {
    return [];
  }
}

export function recordModuleVisit(userId: string | undefined, path: string): ModuleVisitRecord[] {
  const prefix = modulePrefix(path);
  if (!prefix) return loadVisitedModules(userId);
  const prev = loadVisitedModules(userId);
  const idx = prev.findIndex((m) => m.path === prefix);
  let next: ModuleVisitRecord[];
  if (idx >= 0) {
    next = [...prev];
    next[idx] = { ...next[idx], visitedAt: new Date().toISOString(), count: next[idx].count + 1 };
  } else {
    next = [{ path: prefix, visitedAt: new Date().toISOString(), count: 1 }, ...prev].slice(0, 64);
  }
  localStorage.setItem(lsKey(userId, 'modules'), JSON.stringify(next));
  return next;
}

export function modulePrefix(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg || seg === 'login') return null;
  return `/${seg}`;
}

export function loadAssistantPanelOpen(userId: string | undefined): boolean {
  try {
    return sessionStorage.getItem(lsKey(userId, 'panel_open')) === '1';
  } catch {
    return false;
  }
}

export function saveAssistantPanelOpen(userId: string | undefined, open: boolean) {
  sessionStorage.setItem(lsKey(userId, 'panel_open'), open ? '1' : '0');
}

export function scanFormDrafts(): Array<{ formId: string; savedAt?: string }> {
  const drafts: Array<{ formId: string; savedAt?: string }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('agroerp_form_draft_')) continue;
      const formId = key.replace('agroerp_form_draft_', '');
      if (!formId) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? '{}') as { draftId?: string };
        drafts.push({ formId, savedAt: parsed.draftId });
      } catch {
        drafts.push({ formId });
      }
    }
  } catch { /* ignore */ }
  return drafts;
}
