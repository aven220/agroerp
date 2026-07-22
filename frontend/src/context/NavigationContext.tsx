import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  ALL_NAV_ITEMS,
  DEFAULT_EXPANDED_CATEGORIES,
  NAV_CATEGORIES,
  type NavCategory,
  type NavCategoryId,
  type NavItem,
  findNavItemByPath,
} from '../config/navigation';
import type { DashboardRole } from '../config/navigation';
import { DEFAULT_WIDGET_ORDER } from '../config/dashboardWidgets';
import { resolveDashboardRole } from '../config/navigation';
import { filterNavByProgression, markOpsActivity, resolveNavProgression } from '../config/navProgression';
import { parseEntityFromPath, recordWorkEntityVisit } from '../lib/workEntityHistory';
import { useAuth } from './AuthContext';
import { useExperienceCenterOptional } from './ExperienceCenterContext';

export interface FavoriteItem {
  id: string;
  to: string;
  label: string;
  icon: string;
  order: number;
}

interface NavigationContextValue {
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (id: NavCategoryId) => void;
  expandGroup: (id: NavCategoryId) => void;
  favorites: FavoriteItem[];
  addFavorite: (item: NavItem) => void;
  removeFavorite: (id: string) => void;
  reorderFavorites: (ids: string[]) => void;
  isFavorite: (id: string) => boolean;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  navHistory: NavItem[];
  recordVisit: (pathname: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  filterNavItem: (item: NavItem) => boolean;
  visibleCategories: NavCategory[];
  widgetLayout: { order: string[]; hidden: string[] };
  setWidgetOrder: (order: string[]) => void;
  toggleWidget: (id: string) => void;
  replaceWidgetLayout: (layout: { order: string[]; hidden: string[] }) => void;
  resetWidgetLayout: (role: DashboardRole) => void;
  dashboardRole: DashboardRole;
  sidebarScroll: number;
  setSidebarScroll: (top: number) => void;
  lastMenuPath: string;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

function storageKey(userId: string | undefined, key: string) {
  return `agroerp_${key}_${userId ?? 'anon'}`;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const experience = useExperienceCenterOptional();
  const userId = user?.id;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(userId, 'nav_collapsed_v5')) ?? '{}');
    } catch {
      return {};
    }
  });

  const [sidebarScroll, setSidebarScroll] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(storageKey(userId, 'nav_sidebar_scroll_v1')) || '0') || 0;
    } catch {
      return 0;
    }
  });

  const [lastMenuPath, setLastMenuPath] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey(userId, 'nav_last_menu_v1')) ?? '';
    } catch {
      return '';
    }
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(userId, 'favorites')) ?? '[]');
    } catch {
      return [];
    }
  });

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(userId, 'recent_searches')) ?? '[]');
    } catch {
      return [];
    }
  });

  const [navHistory, setNavHistory] = useState<NavItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(userId, 'nav_history')) ?? '[]');
    } catch {
      return [];
    }
  });

  const [widgetLayout, setWidgetLayout] = useState<{ order: string[]; hidden: string[] }>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey(userId, 'dashboard_layout')) ?? '{"order":[],"hidden":[]}');
    } catch {
      return { order: [], hidden: [] };
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const dashboardRole = useMemo(
    () => resolveDashboardRole(user?.roles ?? []),
    [user?.roles],
  );

  const [prefsUserId, setPrefsUserId] = useState(userId);

  useEffect(() => {
    try {
      setCollapsedGroups(JSON.parse(localStorage.getItem(storageKey(userId, 'nav_collapsed_v5')) ?? '{}'));
    } catch {
      setCollapsedGroups({});
    }
    try {
      setSidebarScroll(Number(localStorage.getItem(storageKey(userId, 'nav_sidebar_scroll_v1')) || '0') || 0);
    } catch {
      setSidebarScroll(0);
    }
    try {
      setLastMenuPath(localStorage.getItem(storageKey(userId, 'nav_last_menu_v1')) ?? '');
    } catch {
      setLastMenuPath('');
    }
    try {
      setFavorites(JSON.parse(localStorage.getItem(storageKey(userId, 'favorites')) ?? '[]'));
    } catch {
      setFavorites([]);
    }
    try {
      setRecentSearches(JSON.parse(localStorage.getItem(storageKey(userId, 'recent_searches')) ?? '[]'));
    } catch {
      setRecentSearches([]);
    }
    try {
      setNavHistory(JSON.parse(localStorage.getItem(storageKey(userId, 'nav_history')) ?? '[]'));
    } catch {
      setNavHistory([]);
    }
    try {
      setWidgetLayout(
        JSON.parse(localStorage.getItem(storageKey(userId, 'dashboard_layout')) ?? '{"order":[],"hidden":[]}'),
      );
    } catch {
      setWidgetLayout({ order: [], hidden: [] });
    }
    setPrefsUserId(userId);
  }, [userId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'nav_collapsed_v5'), JSON.stringify(collapsedGroups));
  }, [collapsedGroups, userId, prefsUserId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'nav_sidebar_scroll_v1'), String(sidebarScroll));
  }, [sidebarScroll, userId, prefsUserId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'nav_last_menu_v1'), lastMenuPath);
  }, [lastMenuPath, userId, prefsUserId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'favorites'), JSON.stringify(favorites));
  }, [favorites, userId, prefsUserId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'recent_searches'), JSON.stringify(recentSearches));
  }, [recentSearches, userId, prefsUserId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'nav_history'), JSON.stringify(navHistory));
  }, [navHistory, userId, prefsUserId]);

  useEffect(() => {
    if (prefsUserId !== userId) return;
    localStorage.setItem(storageKey(userId, 'dashboard_layout'), JSON.stringify(widgetLayout));
  }, [widgetLayout, userId, prefsUserId]);

  const filterNavItem = useCallback(
    (item: NavItem) => {
      if (!item.permission) return true;
      return hasPermission(item.permission);
    },
    [hasPermission],
  );

  const baseCategories = experience?.experienceNav ?? NAV_CATEGORIES;

  const [opsTick, setOpsTick] = useState(0);

  const progression = useMemo(
    () =>
      resolveNavProgression({
        navHistoryLength: navHistory.length,
        roles: user?.roles ?? [],
      }),
    [navHistory.length, user?.roles, opsTick],
  );

  const visibleCategories = useMemo(() => {
    const permitted = baseCategories
      .map((cat) => {
        const items = cat.items.filter(filterNavItem);
        if (items.length === 0 && cat.id !== 'home') return null;
        return { ...cat, items };
      })
      .filter(Boolean) as NavCategory[];
    return filterNavByProgression(permitted, progression);
  }, [baseCategories, filterNavItem, progression]);

  /** PM-42: acordeón — solo un grupo abierto a la vez */
  const toggleGroup = useCallback((id: NavCategoryId) => {
    setCollapsedGroups((prev) => {
      const cat = baseCategories.find((c) => c.id === id) ?? NAV_CATEGORIES.find((c) => c.id === id);
      const defaultCollapsed = cat?.defaultCollapsed ?? !DEFAULT_EXPANDED_CATEGORIES.includes(id);
      const currentlyCollapsed = prev[id] ?? defaultCollapsed;
      const willOpen = currentlyCollapsed;
      const next: Record<string, boolean> = {};
      for (const c of baseCategories) {
        if (c.id === 'home') {
          next[c.id] = false;
          continue;
        }
        next[c.id] = willOpen ? c.id !== id : true;
      }
      return next;
    });
  }, [baseCategories]);

  const expandGroup = useCallback((id: NavCategoryId) => {
    if (id === 'home' || id === 'favorites') return;
    setCollapsedGroups(() => {
      const next: Record<string, boolean> = {};
      for (const c of baseCategories) {
        if (c.id === 'home') {
          next[c.id] = false;
          continue;
        }
        next[c.id] = c.id !== id;
      }
      return next;
    });
  }, [baseCategories]);

  const addFavorite = useCallback((item: NavItem) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === item.id)) return prev;
      return [...prev, { id: item.id, to: item.to, label: item.label, icon: item.icon, order: prev.length }];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i })));
  }, []);

  const reorderFavorites = useCallback((ids: string[]) => {
    setFavorites((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      return ids.map((id, i) => ({ ...map.get(id)!, order: i })).filter(Boolean);
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const addRecentSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, 12));
  }, []);

  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const recordVisit = useCallback((pathname: string) => {
    const experienceItems = experience?.experienceNav.flatMap((c) => c.items) ?? [];
    const match =
      findNavItemByPath(pathname) ??
      experienceItems.find((i) =>
        i.exact ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`),
      ) ??
      ALL_NAV_ITEMS.find((i) => i.to === pathname);
    if (!match || match.to === '/') return;
    setNavHistory((prev) => {
      if (prev[0]?.id === match.id) return prev;
      return [match, ...prev.filter((h) => h.id !== match.id)].slice(0, 15);
    });
  }, [experience?.experienceNav]);

  useEffect(() => {
    recordVisit(location.pathname);
    setLastMenuPath(location.pathname);
    if (
      location.pathname.startsWith('/compras') ||
      location.pathname.startsWith('/inventario') ||
      location.pathname.startsWith('/productores')
    ) {
      markOpsActivity();
      setOpsTick((t) => t + 1);
    }
    const entity = parseEntityFromPath(location.pathname);
    if (entity) recordWorkEntityVisit(userId, entity);
    const match = findNavItemByPath(location.pathname);
    if (match) {
      for (const cat of baseCategories) {
        if (cat.id === 'home') continue;
        if (cat.items.some((i) => i.id === match.id)) {
          expandGroup(cat.id);
          break;
        }
      }
    }
  }, [location.pathname, recordVisit, expandGroup, userId, baseCategories]);

  const setWidgetOrder = useCallback((order: string[]) => {
    setWidgetLayout((prev) => ({ ...prev, order }));
  }, []);

  const toggleWidget = useCallback((id: string) => {
    setWidgetLayout((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id) ? prev.hidden.filter((x) => x !== id) : [...prev.hidden, id],
    }));
  }, []);

  const replaceWidgetLayout = useCallback((layout: { order: string[]; hidden: string[] }) => {
    setWidgetLayout({ order: layout.order, hidden: layout.hidden });
  }, []);

  const resetWidgetLayout = useCallback((role: DashboardRole) => {
    setWidgetLayout({ order: DEFAULT_WIDGET_ORDER[role], hidden: [] });
  }, []);

  const value = useMemo(
    () => ({
      collapsedGroups,
      toggleGroup,
      expandGroup,
      favorites,
      addFavorite,
      removeFavorite,
      reorderFavorites,
      isFavorite,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
      navHistory,
      recordVisit,
      sidebarOpen,
      setSidebarOpen,
      searchOpen,
      setSearchOpen,
      filterNavItem,
      visibleCategories,
      widgetLayout,
      setWidgetOrder,
      toggleWidget,
      replaceWidgetLayout,
      resetWidgetLayout,
      dashboardRole,
      sidebarScroll,
      setSidebarScroll,
      lastMenuPath,
    }),
    [
      collapsedGroups, toggleGroup, expandGroup, favorites, addFavorite, removeFavorite,
      reorderFavorites, isFavorite, recentSearches, addRecentSearch, clearRecentSearches,
      navHistory, recordVisit, sidebarOpen, searchOpen, filterNavItem, visibleCategories,
      widgetLayout, setWidgetOrder, toggleWidget, replaceWidgetLayout, resetWidgetLayout, dashboardRole,
      sidebarScroll, lastMenuPath,
    ],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
