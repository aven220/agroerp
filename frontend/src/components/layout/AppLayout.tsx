import { NavigationDrawer, NavMenuButton } from './NavigationDrawer';
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

/**
 * PM-46 — Shell full-width + Navigation Drawer derecho.
 * Sin sidebar fijo. Contenido 100% ancho.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const mobile = useMobileOptional();
  const isMobile = mobile?.isMobile ?? false;
  const isTablet = mobile?.isTablet ?? false;
  const gw = useGuidedWorkspaceOptional();
  const adaptive = useAdaptiveWorkspaceOptional();
  const panelOpen = gw?.panelOpen ?? false;
  const focusMode = adaptive?.focusMode ?? false;
  const chromeLevel = adaptive?.profile.chromeLevel ?? 'normal';

  return (
    <div
      className={`erp-shell erp-shell-pm46${isMobile ? ' erp-shell-mobile' : ''}${isTablet ? ' erp-shell-tablet' : ''}${panelOpen && !isMobile && !focusMode ? ' guided-workspace-open' : ''}${focusMode ? ' erp-shell-focus' : ''}${chromeLevel === 'compact' ? ' erp-shell-compact-chrome' : ''}`}
    >
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <div className="erp-main erp-main-full">
        {!focusMode ? (
          <div className="shell-menu-anchor" aria-hidden={false}>
            <NavMenuButton className="shell-menu-fallback" />
          </div>
        ) : null}
        <OfflineBanner />
        <PullToRefresh>
          <div className="erp-content" id="main-content" tabIndex={-1}>
            {children}
          </div>
        </PullToRefresh>
      </div>
      {!focusMode ? <NavigationDrawer /> : null}
      {isMobile ? (
        <>
          <BottomNav />
          <MobileMoreSheet />
          <SyncQueueSheet />
        </>
      ) : null}
      {panelOpen && !focusMode ? <GuidedWorkspacePanel /> : null}
      <CommandPalette />
    </div>
  );
}
