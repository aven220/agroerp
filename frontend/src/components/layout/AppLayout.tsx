import { EnterpriseHeader } from './EnterpriseHeader';
import { CommandPalette } from '../command/CommandPalette';
import { GuidedWorkspacePanel } from '../guided-workspace/GuidedWorkspacePanel';
import { BottomNav } from '../mobile/BottomNav';
import { OfflineBanner } from '../mobile/OfflineBanner';
import { MobileMoreSheet } from '../mobile/MobileMoreSheet';
import { SyncQueueSheet } from '../mobile/SyncQueueSheet';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { useMobileOptional } from '../../context/MobileContext';
import { useGuidedWorkspaceOptional } from '../../context/GuidedWorkspaceContext';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';
import { useUserPreferencesOptional } from '../../context/UserPreferencesContext';

/**
 * PM-50 — Shell enterprise: header unificado + contenido full-width.
 * Guided workspace como overlay (nunca reduce el área de trabajo).
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const mobile = useMobileOptional();
  const isMobile = mobile?.isMobile ?? false;
  const isTablet = mobile?.isTablet ?? false;
  const gw = useGuidedWorkspaceOptional();
  const adaptive = useAdaptiveWorkspaceOptional();
  const prefs = useUserPreferencesOptional();
  const panelOpen = gw?.panelOpen ?? false;
  const focusMode = adaptive?.focusMode ?? false;
  const chromeLevel = adaptive?.profile.chromeLevel ?? 'normal';
  const assistantEnabled = prefs?.assistantEnabled ?? false;
  const showGuided = assistantEnabled && panelOpen && !isMobile && !focusMode;

  return (
    <div
      className={`erp-shell erp-shell-pm43 erp-shell-pm50${isMobile ? ' erp-shell-mobile' : ''}${isTablet ? ' erp-shell-tablet' : ''}${showGuided ? ' guided-workspace-open' : ''}${focusMode ? ' erp-shell-focus' : ''}${chromeLevel === 'compact' ? ' erp-shell-compact-chrome' : ''}`}
    >
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <EnterpriseHeader />
      <div className="erp-main erp-main-fullbleed">
        <OfflineBanner />
        <PullToRefresh>
          <div className="erp-content" id="main-content" tabIndex={-1}>
            {children}
          </div>
        </PullToRefresh>
      </div>
      {isMobile ? (
        <>
          <BottomNav />
          <MobileMoreSheet />
          <SyncQueueSheet />
        </>
      ) : null}
      {showGuided ? (
        <>
          <button
            type="button"
            className="gwp-backdrop"
            aria-label="Cerrar espacio de trabajo"
            onClick={() => gw?.setPanelOpen(false)}
          />
          <GuidedWorkspacePanel />
        </>
      ) : null}
      <CommandPalette />
    </div>
  );
}
