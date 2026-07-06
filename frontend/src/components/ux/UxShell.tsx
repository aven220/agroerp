import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { UserPreferencesDrawer } from './UserPreferencesDrawer';
import { OnboardingTour } from './OnboardingTour';
import { AutoOnboarding } from './AutoOnboarding';

export function UxShell() {
  return (
    <>
      <KeyboardShortcutsModal />
      <UserPreferencesDrawer />
      <OnboardingTour />
      <AutoOnboarding />
    </>
  );
}

export { LoadingState, ModuleLoadingFallback, PageLoader } from './LoadingState';
export { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
export { UserPreferencesDrawer } from './UserPreferencesDrawer';
export { OnboardingTour } from './OnboardingTour';
