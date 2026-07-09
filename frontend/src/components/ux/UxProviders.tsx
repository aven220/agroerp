import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPreferencesProvider } from '../../context/UserPreferencesContext';
import { KeyboardShortcutsProvider } from '../../context/KeyboardShortcutsContext';
import { CommandProvider } from '../../context/CommandProvider';
import { HelpProvider } from '../../context/HelpContext';
import { SmartAssistantProvider } from '../../context/SmartAssistantProvider';
import { UxShell } from './UxShell';

export function UxProviders({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <UserPreferencesProvider userId={user?.id}>
      <KeyboardShortcutsProvider>
        <CommandProvider>
          <HelpProvider>
            <SmartAssistantProvider>
              {children}
              <UxShell />
            </SmartAssistantProvider>
          </HelpProvider>
        </CommandProvider>
      </KeyboardShortcutsProvider>
    </UserPreferencesProvider>
  );
}
