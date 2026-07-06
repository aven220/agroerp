import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPreferencesProvider } from '../../context/UserPreferencesContext';
import { KeyboardShortcutsProvider } from '../../context/KeyboardShortcutsContext';
import { HelpProvider } from '../../context/HelpContext';
import { UxShell } from './UxShell';

export function UxProviders({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <UserPreferencesProvider userId={user?.id}>
      <KeyboardShortcutsProvider>
        <HelpProvider>
          {children}
          <UxShell />
        </HelpProvider>
      </KeyboardShortcutsProvider>
    </UserPreferencesProvider>
  );
}
