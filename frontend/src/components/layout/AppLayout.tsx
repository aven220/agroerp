import { SmartSidebar } from './SmartSidebar';
import { AppShellBar } from './AppShellBar';
import { CommandPalette } from '../command/CommandPalette';
import { GuidedWorkspacePanel } from '../guided-workspace/GuidedWorkspacePanel';
import { BottomNav } from '../mobile/BottomNav';
import { MobileFAB } from '../mobile/MobileFAB';
import { OfflineBanner } from '../mobile/OfflineBanner';
import { MobileMoreSheet } from '../mobile/MobileMoreSheet';
import { SyncQueueSheet } from '../mobile/SyncQueueSheet';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { useMobileOptional } from '../../context/MobileContext';
import { useGuidedWorkspaceOptional } from '../../context/GuidedWorkspaceContext';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';

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
      className={`erp-shell${isMobile ? ' erp-shell-mobile' : ''}${isTablet ? ' erp-shell-tablet' : ''}${panelOpen && !isMobile && !focusMode ? ' guided-workspace-open' : ''}${focusMode ? ' erp-shell-focus' : ''}${chromeLevel === 'compact' ? ' erp-shell-compact-chrome' : ''}`}
    >
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      {!isMobile && !focusMode ? <SmartSidebar /> : null}
      <div className="erp-main">
        <AppShellBar compact={isMobile} />
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
          <MobileFAB />
          <MobileMoreSheet />
          <SyncQueueSheet />
        </>
      ) : null}
      {panelOpen && !focusMode ? <GuidedWorkspacePanel /> : null}
      <CommandPalette />
    </div>
  );
}
