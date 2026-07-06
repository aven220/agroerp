import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useViewport } from '../hooks/useMediaQuery';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { getMobileQuickTiles, getMobileTabsForRole } from '../config/mobileNavigation';
import { useAuth } from './AuthContext';
import { useNavigation } from './NavigationContext';

interface MobileContextValue {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  syncOpen: boolean;
  setSyncOpen: (open: boolean) => void;
  captureOpen: boolean;
  setCaptureOpen: (open: boolean) => void;
  mobileTabs: ReturnType<typeof getMobileTabsForRole>;
  quickTiles: ReturnType<typeof getMobileQuickTiles>;
  online: boolean;
  pendingCount: number;
  queueItems: ReturnType<typeof useOfflineQueue>['items'];
  enqueueDraft: ReturnType<typeof useOfflineQueue>['enqueue'];
  updateQueueItem: ReturnType<typeof useOfflineQueue>['updateItem'];
  removeQueueItem: ReturnType<typeof useOfflineQueue>['removeItem'];
  pullRefreshing: boolean;
  triggerPullRefresh: () => Promise<void>;
}

const MobileContext = createContext<MobileContextValue | null>(null);

export function MobileProvider({ children }: { children: ReactNode }) {
  const { isMobile, isTablet, isTouch } = useViewport();
  const { hasPermission } = useAuth();
  const { dashboardRole } = useNavigation();
  const offline = useOfflineQueue();
  const [moreOpen, setMoreOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const mobileTabs = useMemo(
    () => getMobileTabsForRole(dashboardRole, hasPermission),
    [dashboardRole, hasPermission],
  );

  const quickTiles = useMemo(
    () => getMobileQuickTiles(dashboardRole, hasPermission),
    [dashboardRole, hasPermission],
  );

  const triggerPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    window.dispatchEvent(new CustomEvent('agroerp:refresh'));
    await new Promise((r) => setTimeout(r, 600));
    setPullRefreshing(false);
  }, []);

  const value: MobileContextValue = {
    isMobile,
    isTablet,
    isTouch,
    moreOpen,
    setMoreOpen,
    syncOpen,
    setSyncOpen,
    captureOpen,
    setCaptureOpen,
    mobileTabs,
    quickTiles,
    online: offline.online,
    pendingCount: offline.pendingCount,
    queueItems: offline.items,
    enqueueDraft: offline.enqueue,
    updateQueueItem: offline.updateItem,
    removeQueueItem: offline.removeItem,
    pullRefreshing,
    triggerPullRefresh,
  };

  return <MobileContext.Provider value={value}>{children}</MobileContext.Provider>;
}

export function useMobile() {
  const ctx = useContext(MobileContext);
  if (!ctx) throw new Error('useMobile requires MobileProvider');
  return ctx;
}

export function useMobileOptional() {
  return useContext(MobileContext);
}
