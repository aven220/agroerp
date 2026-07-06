import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useUserPreferences } from './UserPreferencesContext';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
}

const ONBOARDING_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '.erp-content',
    title: 'Bienvenido a AGROERP',
    body: 'Su plataforma Enterprise unificada para operación agrícola, logística y gestión.',
  },
  {
    id: 'search',
    target: '.global-search-trigger',
    title: 'Búsqueda global',
    body: 'Presione ⌘K para encontrar pantallas, procesos y reportes al instante.',
  },
  {
    id: 'sidebar',
    target: '.smart-sidebar',
    title: 'Navegación inteligente',
    body: 'Menú organizado por categorías, filtrado según sus permisos y rol.',
  },
  {
    id: 'dashboard',
    target: '.erp-content',
    title: 'Workspace personalizable',
    body: 'Widgets, favoritos y vistas adaptadas a su perfil de trabajo.',
  },
  {
    id: 'shortcuts',
    target: '.app-shell-bar',
    title: 'Atajos de teclado',
    body: 'Presione ? en cualquier momento para ver todos los atajos disponibles.',
  },
];

interface HelpContextValue {
  tourOpen: boolean;
  tourStep: number;
  startTour: () => void;
  nextTourStep: () => void;
  skipTour: () => void;
  steps: TourStep[];
  showTip: (id: string, message: string) => void;
  activeTip: string | null;
  dismissTip: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const { onboardingDone, setPreference, tipsEnabled } = useUserPreferences();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [activeTip, setActiveTip] = useState<string | null>(null);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourOpen(true);
  }, []);

  const nextTourStep = useCallback(() => {
    setTourStep((s) => {
      if (s >= ONBOARDING_STEPS.length - 1) {
        setTourOpen(false);
        setPreference('onboardingDone', true);
        return s;
      }
      return s + 1;
    });
  }, [setPreference]);

  const skipTour = useCallback(() => {
    setTourOpen(false);
    setPreference('onboardingDone', true);
  }, [setPreference]);

  const showTip = useCallback((id: string, _message: string) => {
    if (!tipsEnabled) return;
    setActiveTip(id);
  }, [tipsEnabled]);

  const dismissTip = useCallback(() => setActiveTip(null), []);

  const value = useMemo(
    () => ({
      tourOpen,
      tourStep,
      startTour,
      nextTourStep,
      skipTour,
      steps: ONBOARDING_STEPS,
      showTip,
      activeTip,
      dismissTip,
    }),
    [tourOpen, tourStep, startTour, nextTourStep, skipTour, showTip, activeTip, dismissTip],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp requires HelpProvider');
  return ctx;
}
