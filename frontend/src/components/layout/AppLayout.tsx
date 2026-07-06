import { SmartSidebar } from './SmartSidebar';
import { AppShellBar } from './AppShellBar';
import { GlobalSearch } from './GlobalSearch';
import { BottomNav } from '../mobile/BottomNav';
import { MobileFAB } from '../mobile/MobileFAB';
import { OfflineBanner } from '../mobile/OfflineBanner';
import { MobileMoreSheet } from '../mobile/MobileMoreSheet';
import { SyncQueueSheet } from '../mobile/SyncQueueSheet';
import { PullToRefresh } from '../mobile/PullToRefresh';
import { useMobileOptional } from '../../context/MobileContext';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const mobile = useMobileOptional();
  const isMobile = mobile?.isMobile ?? false;
  const isTablet = mobile?.isTablet ?? false;

  return (
    <div className={`erp-shell${isMobile ? ' erp-shell-mobile' : ''}${isTablet ? ' erp-shell-tablet' : ''}`}>
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      {!isMobile ? <SmartSidebar /> : null}
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
      <GlobalSearch />
    </div>
  );
}
