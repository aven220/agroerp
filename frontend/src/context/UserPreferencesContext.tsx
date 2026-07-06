import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type VisualDensity = 'compact' | 'default' | 'comfortable';
export type FontScale = 'sm' | 'md' | 'lg';
export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
export type NumberFormat = 'es-CO' | 'en-US';
export type LocaleCode = 'es-CO' | 'es' | 'en';

export interface UserPreferences {
  density: VisualDensity;
  fontScale: FontScale;
  locale: LocaleCode;
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  timezone: string;
  tipsEnabled: boolean;
  onboardingDone: boolean;
  reducedMotion: 'system' | 'reduce' | 'no-preference';
}

const DEFAULTS: UserPreferences = {
  density: 'default',
  fontScale: 'md',
  locale: 'es-CO',
  dateFormat: 'dd/MM/yyyy',
  numberFormat: 'es-CO',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
  tipsEnabled: true,
  onboardingDone: false,
  reducedMotion: 'system',
};

function storageKey(userId: string | undefined) {
  return `agroerp_prefs_${userId ?? 'anon'}`;
}

function applyPreferences(prefs: UserPreferences) {
  const root = document.documentElement;
  root.setAttribute('data-density', prefs.density);
  root.setAttribute('data-font-scale', prefs.fontScale);
  root.setAttribute('data-locale', prefs.locale);
  if (prefs.reducedMotion === 'reduce') {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }
}

interface UserPreferencesContextValue extends UserPreferences {
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
  formatDate: (value: Date | string | number) => string;
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string;
}) {
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULTS;
  });

  useEffect(() => {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
    applyPreferences(prefs);
  }, [prefs, userId]);

  const setPreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPrefs(DEFAULTS);
  }, []);

  const formatDate = useCallback(
    (value: Date | string | number) => {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      switch (prefs.dateFormat) {
        case 'MM/dd/yyyy': return `${month}/${day}/${year}`;
        case 'yyyy-MM-dd': return `${year}-${month}-${day}`;
        default: return `${day}/${month}/${year}`;
      }
    },
    [prefs.dateFormat],
  );

  const formatNumber = useCallback(
    (value: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(prefs.numberFormat, opts).format(value),
    [prefs.numberFormat],
  );

  const value = useMemo(
    () => ({
      ...prefs,
      setPreference,
      resetPreferences,
      formatDate,
      formatNumber,
    }),
    [prefs, setPreference, resetPreferences, formatDate, formatNumber],
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences requires UserPreferencesProvider');
  return ctx;
}

export function useUserPreferencesOptional() {
  return useContext(UserPreferencesContext);
}
