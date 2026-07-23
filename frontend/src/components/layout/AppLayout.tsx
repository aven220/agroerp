import { EnterpriseTopBar } from './EnterpriseTopBar';
import { EnterpriseSidebar } from './EnterpriseSidebar';
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
 * PM-42 — Shell enterprise: TopBar + Sidebar fijo + Contenido.
 * Sin hamburguesa. Sin drawer de navegación.
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
      className={`erp-shell erp-shell-pm42${isMobile ? ' erp-shell-mobile' : ''}${isTablet ? ' erp-shell-tablet' : ''}${showGuided ? ' guided-workspace-open' : ''}${focusMode ? ' erp-shell-focus' : ''}${chromeLevel === 'compact' ? ' erp-shell-compact-chrome' : ''}`}
    >
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      {!focusMode ? <EnterpriseTopBar /> : null}
      <div className="erp-body">
        {!focusMode ? <EnterpriseSidebar /> : null}
        <div className="erp-main">
          <OfflineBanner />
          <PullToRefresh>
            <div className="erp-content" id="main-content" tabIndex={-1}>
              {children}
            </div>
          </PullToRefresh>
        </div>
      </div>
      {isMobile ? (
        <>
          <BottomNav />
          <MobileMoreSheet />
          <SyncQueueSheet />
        </>
      ) : null}
      {showGuided ? <GuidedWorkspacePanel /> : null}
      <CommandPalette />
    </div>
  );
}
