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
import { useAuth } from './AuthContext';
import { useNavigation } from './NavigationContext';
import { useGuidedWorkspaceOptional } from './GuidedWorkspaceContext';
import { useOnEntityUpdated } from '../lib/entitySync';

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

  const [mode, setMode] = useState<CommandPaletteMode>('launcher');
  const [query, setQuery] = useState('');
  const [recentCommandIds, setRecentCommandIds] = useState(() => loadRecentCommandIds(userId));
  const [favoriteCommandIds, setFavoriteCommandIds] = useState(() => loadFavoriteCommandIds(userId));
  const [entityTick, setEntityTick] = useState(0);

  useOnEntityUpdated(() => setEntityTick((t) => t + 1));

  const openPalette = useCallback(
    (paletteMode: CommandPaletteMode = 'launcher') => {
      setMode(paletteMode);
      setQuery('');
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
    ],
  );

  const filteredCommands = useMemo(
    () => filterCommands(commands, query, mode, recentCommandIds),
    [commands, query, mode, recentCommandIds],
  );

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
