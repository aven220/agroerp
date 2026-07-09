/**
 * PM-07 — Preferencias del workspace adaptativo (solo localStorage).
 */

export interface AdaptivePreferences {
  adaptiveEnabled: boolean;
  focusMode: boolean;
  dismissedWidgetSuggestionAt?: string;
  dismissedFocusSuggestionAt?: string;
  userDensityOverride?: boolean;
}

const DEFAULTS: AdaptivePreferences = {
  adaptiveEnabled: true,
  focusMode: false,
};

function storageKey(userId: string | undefined) {
  return `agroerp_aw_prefs_${userId ?? 'anon'}`;
}

const SUGGESTION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function loadAdaptivePreferences(userId: string | undefined): AdaptivePreferences {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) as AdaptivePreferences };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAdaptivePreferences(
  userId: string | undefined,
  prefs: AdaptivePreferences,
): AdaptivePreferences {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  return prefs;
}

export function updateAdaptivePreference<K extends keyof AdaptivePreferences>(
  userId: string | undefined,
  key: K,
  value: AdaptivePreferences[K],
): AdaptivePreferences {
  const next = { ...loadAdaptivePreferences(userId), [key]: value };
  return saveAdaptivePreferences(userId, next);
}

export function isSuggestionDismissed(dismissedAt?: string): boolean {
  if (!dismissedAt) return false;
  return Date.now() - new Date(dismissedAt).getTime() < SUGGESTION_COOLDOWN_MS;
}
