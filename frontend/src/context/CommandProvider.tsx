import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  loadFavoriteCommandIds,
  loadRecentCommandIds,
  recordCommandExecution,
  toggleFavoriteCommandId,
  type CommandPaletteMode,
} from '../lib/commandPalette';
import {
  buildCommandRegistry,
  filterCommands,
  type CommandItem,
} from '../lib/commandRegistry';
import { searchEnterpriseEntities } from '../lib/enterpriseSearch';
import { useAuth } from './AuthContext';
import { useNavigation } from './NavigationContext';
import { useGuidedWorkspaceOptional } from './GuidedWorkspaceContext';
import { useOnEntityUpdated } from '../lib/entitySync';
import { getEnterpriseNavItems } from '../config/enterpriseNavigation';
import { filterNavItemsForPalette } from '../config/navProgression';

interface CommandContextValue {
  mode: CommandPaletteMode;
  setMode: (mode: CommandPaletteMode) => void;
  openPalette: (mode?: CommandPaletteMode) => void;
  commands: CommandItem[];
  filteredCommands: CommandItem[];
  query: string;
  setQuery: (q: string) => void;
  recentCommandIds: string[];
  favoriteCommandIds: string[];
  execute: (cmd: CommandItem) => void;
  toggleFavorite: (commandId: string) => void;
  isFavorite: (commandId: string) => boolean;
}

const CommandContext = createContext<CommandContextValue | null>(null);

export function CommandProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { favorites, navHistory, setSearchOpen } = useNavigation();
  const gw = useGuidedWorkspaceOptional();
  const userId = user?.id;

  /** PM-43: solo menú enterprise + entidades de negocio (sin módulos internos). */
  const packageNavItems = useMemo(
    () => filterNavItemsForPalette(getEnterpriseNavItems()),
    [],
  );

  const [mode, setMode] = useState<CommandPaletteMode>('launcher');
  const [query, setQuery] = useState('');
  const [recentCommandIds, setRecentCommandIds] = useState(() => loadRecentCommandIds(userId));
  const [favoriteCommandIds, setFavoriteCommandIds] = useState(() => loadFavoriteCommandIds(userId));
  const [entityTick, setEntityTick] = useState(0);
  const [liveEntityCommands, setLiveEntityCommands] = useState<CommandItem[]>([]);

  useOnEntityUpdated(() => setEntityTick((t) => t + 1));

  const openPalette = useCallback(
    (paletteMode: CommandPaletteMode = 'launcher') => {
      setMode(paletteMode);
      setQuery('');
      setLiveEntityCommands([]);
      setSearchOpen(true);
    },
    [setSearchOpen],
  );

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: CommandPaletteMode }>).detail;
      openPalette(detail?.mode ?? 'launcher');
    };
    window.addEventListener('agroerp:command-palette', onOpen);
    return () => window.removeEventListener('agroerp:command-palette', onOpen);
  }, [openPalette]);

  useEffect(() => {
    setRecentCommandIds(loadRecentCommandIds(userId));
    setFavoriteCommandIds(loadFavoriteCommandIds(userId));
  }, [userId]);

  useEffect(() => {
    const q = query.trim();
    if (mode !== 'launcher' || q.length < 2) {
      setLiveEntityCommands([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchEnterpriseEntities(q, { hasPermission }).then((hits) => {
        if (cancelled) return;
        setLiveEntityCommands(
          hits.map((hit) => ({
            id: `live-${hit.id}`,
            label: hit.label,
            subtitle: hit.subtitle ? `${hit.kindLabel} · ${hit.subtitle}` : hit.kindLabel,
            icon: hit.icon,
            category: 'entity' as const,
            categoryLabel: hit.kindLabel,
            keywords: [hit.kind, hit.label, hit.subtitle ?? ''],
            to: hit.to,
            run: () => navigate(hit.to),
          })),
        );
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, mode, hasPermission, navigate]);

  const commands = useMemo(
    () =>
      buildCommandRegistry({
        hasPermission,
        navigate,
        favorites,
        navHistory,
        pinned: gw?.pinned ?? [],
        personalShortcuts: gw?.shortcuts ?? [],
        openProcesses: gw?.openProcesses ?? [],
        toggleWorkspace: () => gw?.setPanelOpen(true),
        userId,
        favoriteCommandIds,
        navItems: packageNavItems,
      }),
    [
      hasPermission,
      navigate,
      favorites,
      navHistory,
      gw?.pinned,
      gw?.shortcuts,
      gw?.openProcesses,
      gw?.setPanelOpen,
      userId,
      favoriteCommandIds,
      entityTick,
      packageNavItems,
    ],
  );

  const filteredCommands = useMemo(() => {
    const base = filterCommands(commands, query, mode, recentCommandIds);
    if (liveEntityCommands.length === 0) return base;
    const seen = new Set(base.map((c) => c.id));
    const merged = [...liveEntityCommands.filter((c) => !seen.has(c.id)), ...base];
    return merged.slice(0, 40);
  }, [commands, query, mode, recentCommandIds, liveEntityCommands]);

  const execute = useCallback(
    (cmd: CommandItem) => {
      setRecentCommandIds(recordCommandExecution(userId, cmd.id));
      cmd.run();
    },
    [userId],
  );

  const toggleFavorite = useCallback(
    (commandId: string) => {
      setFavoriteCommandIds(toggleFavoriteCommandId(userId, commandId));
    },
    [userId],
  );

  const isFavorite = useCallback(
    (commandId: string) => favoriteCommandIds.includes(commandId),
    [favoriteCommandIds],
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      openPalette,
      commands,
      filteredCommands,
      query,
      setQuery,
      recentCommandIds,
      favoriteCommandIds,
      execute,
      toggleFavorite,
      isFavorite,
    }),
    [
      mode,
      openPalette,
      commands,
      filteredCommands,
      query,
      recentCommandIds,
      favoriteCommandIds,
      execute,
      toggleFavorite,
      isFavorite,
    ],
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommandPalette() {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommandPalette requires CommandProvider');
  return ctx;
}

export function useCommandPaletteOptional() {
  return useContext(CommandContext);
}
