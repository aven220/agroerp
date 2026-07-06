import { useEffect } from 'react';
import { useHelp } from '../../context/HelpContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';

export function AutoOnboarding() {
  const { onboardingDone } = useUserPreferences();
  const { startTour, tourOpen } = useHelp();

  useEffect(() => {
    if (onboardingDone || tourOpen) return;
    const t = setTimeout(startTour, 1000);
    return () => clearTimeout(t);
  }, [onboardingDone, tourOpen, startTour]);

  return null;
}
