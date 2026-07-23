import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { UserPreferencesDrawer } from './UserPreferencesDrawer';
import { OnboardingTour } from './OnboardingTour';
import { RecommendationCenter } from '../smart-assistant/RecommendationCenter';
import { useUserPreferencesOptional } from '../../context/UserPreferencesContext';

/**
 * PM-42 — Sin AutoOnboarding forzado.
 * Asistente solo si el usuario lo activa en Preferencias.
 */
export function UxShell() {
  const prefs = useUserPreferencesOptional();
  const assistantEnabled = prefs?.assistantEnabled ?? false;

  return (
    <>
      <KeyboardShortcutsModal />
      <UserPreferencesDrawer />
      {assistantEnabled ? <OnboardingTour /> : null}
      {assistantEnabled ? <RecommendationCenter /> : null}
    </>
  );
}

export { LoadingState, ModuleLoadingFallback, PageLoader } from './LoadingState';
export { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
export { UserPreferencesDrawer } from './UserPreferencesDrawer';
export { OnboardingTour } from './OnboardingTour';
