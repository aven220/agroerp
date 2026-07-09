import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addPersonalShortcut,
  addPersonalTask,
  addQuickNote,
  guidedRecordIcon,
  isRecordPinned,
  loadOpenProcesses,
  loadPanelOpen,
  loadPersonalShortcuts,
  loadPersonalTasks,
  loadPinnedRecords,
  loadQuickNotes,
  loadWorkingSets,
  pinRecord,
  recordOpenProcess,
  removeOpenProcess,
  removePersonalShortcut,
  removePersonalTask,
  removeQuickNote,
  removeWorkingSet,
  restoreWorkingSet,
  savePanelOpen,
  saveWorkingSet,
  togglePersonalTask,
  unpinRecord,
  type GuidedOpenProcess,
  type GuidedPersonalShortcut,
  type GuidedPersonalTask,
  type GuidedPinnedRecord,
  type GuidedQuickNote,
  type GuidedRecordKind,
  type GuidedWorkingSet,
} from '../lib/guidedWorkspace';
import { useAuth } from './AuthContext';

interface GuidedWorkspaceContextValue {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  pinned: GuidedPinnedRecord[];
  pin: (record: Omit<GuidedPinnedRecord, 'pinnedAt'>) => void;
  unpin: (kind: GuidedRecordKind, id: string) => void;
  isPinned: (kind: GuidedRecordKind, id: string) => boolean;
  tasks: GuidedPersonalTask[];
  addTask: (label: string, to?: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  shortcuts: GuidedPersonalShortcut[];
  addShortcut: (label: string, to: string, icon?: string) => void;
  removeShortcut: (id: string) => void;
  notes: GuidedQuickNote[];
  addNote: (text: string, entityLabel?: string) => void;
  removeNote: (id: string) => void;
  workingSets: GuidedWorkingSet[];
  saveSet: (name: string) => void;
  restoreSet: (id: string) => void;
  deleteSet: (id: string) => void;
  openProcesses: GuidedOpenProcess[];
  trackOpenProcess: (proc: Omit<GuidedOpenProcess, 'openedAt'>) => void;
  dismissOpenProcess: (id: string) => void;
  recordIcon: typeof guidedRecordIcon;
}

const GuidedWorkspaceContext = createContext<GuidedWorkspaceContextValue | null>(null);

export function GuidedWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [panelOpen, setPanelOpenState] = useState(() => loadPanelOpen(userId));
  const [pinned, setPinned] = useState(() => loadPinnedRecords(userId));
  const [tasks, setTasks] = useState(() => loadPersonalTasks(userId));
  const [shortcuts, setShortcuts] = useState(() => loadPersonalShortcuts(userId));
  const [notes, setNotes] = useState(() => loadQuickNotes(userId));
  const [workingSets, setWorkingSets] = useState(() => loadWorkingSets(userId));
  const [openProcesses, setOpenProcesses] = useState(() => loadOpenProcesses(userId));

  useEffect(() => {
    setPanelOpenState(loadPanelOpen(userId));
    setPinned(loadPinnedRecords(userId));
    setTasks(loadPersonalTasks(userId));
    setShortcuts(loadPersonalShortcuts(userId));
    setNotes(loadQuickNotes(userId));
    setWorkingSets(loadWorkingSets(userId));
    setOpenProcesses(loadOpenProcesses(userId));
  }, [userId]);

  const setPanelOpen = useCallback(
    (open: boolean) => {
      setPanelOpenState(open);
      savePanelOpen(userId, open);
    },
    [userId],
  );

  const togglePanel = useCallback(() => {
    setPanelOpenState((prev) => {
      const next = !prev;
      savePanelOpen(userId, next);
      return next;
    });
  }, [userId]);

  const pin = useCallback(
    (record: Omit<GuidedPinnedRecord, 'pinnedAt'>) => setPinned(pinRecord(userId, record)),
    [userId],
  );

  const unpin = useCallback(
    (kind: GuidedRecordKind, id: string) => setPinned(unpinRecord(userId, kind, id)),
    [userId],
  );

  const isPinnedFn = useCallback(
    (kind: GuidedRecordKind, id: string) => isRecordPinned(userId, kind, id),
    [userId],
  );

  const addTask = useCallback(
    (label: string, to?: string) => setTasks(addPersonalTask(userId, label, to)),
    [userId],
  );

  const toggleTask = useCallback(
    (id: string) => setTasks(togglePersonalTask(userId, id)),
    [userId],
  );

  const removeTask = useCallback(
    (id: string) => setTasks(removePersonalTask(userId, id)),
    [userId],
  );

  const addShortcut = useCallback(
    (label: string, to: string, icon?: string) =>
      setShortcuts(addPersonalShortcut(userId, label, to, icon)),
    [userId],
  );

  const removeShortcut = useCallback(
    (id: string) => setShortcuts(removePersonalShortcut(userId, id)),
    [userId],
  );

  const addNote = useCallback(
    (text: string, entityLabel?: string) => setNotes(addQuickNote(userId, text, entityLabel)),
    [userId],
  );

  const removeNote = useCallback(
    (id: string) => setNotes(removeQuickNote(userId, id)),
    [userId],
  );

  const saveSet = useCallback(
    (name: string) => {
      setWorkingSets(saveWorkingSet(userId, name, pinned));
    },
    [userId, pinned],
  );

  const restoreSet = useCallback(
    (id: string) => setPinned(restoreWorkingSet(userId, id)),
    [userId],
  );

  const deleteSet = useCallback(
    (id: string) => setWorkingSets(removeWorkingSet(userId, id)),
    [userId],
  );

  const trackOpenProcess = useCallback(
    (proc: Omit<GuidedOpenProcess, 'openedAt'>) =>
      setOpenProcesses(recordOpenProcess(userId, proc)),
    [userId],
  );

  const dismissOpenProcess = useCallback(
    (id: string) => setOpenProcesses(removeOpenProcess(userId, id)),
    [userId],
  );

  const value = useMemo(
    () => ({
      panelOpen,
      setPanelOpen,
      togglePanel,
      pinned,
      pin,
      unpin,
      isPinned: isPinnedFn,
      tasks,
      addTask,
      toggleTask,
      removeTask,
      shortcuts,
      addShortcut,
      removeShortcut,
      notes,
      addNote,
      removeNote,
      workingSets,
      saveSet,
      restoreSet,
      deleteSet,
      openProcesses,
      trackOpenProcess,
      dismissOpenProcess,
      recordIcon: guidedRecordIcon,
    }),
    [
      panelOpen, setPanelOpen, togglePanel, pinned, pin, unpin, isPinnedFn,
      tasks, addTask, toggleTask, removeTask, shortcuts, addShortcut, removeShortcut,
      notes, addNote, removeNote, workingSets, saveSet, restoreSet, deleteSet,
      openProcesses, trackOpenProcess, dismissOpenProcess,
    ],
  );

  return (
    <GuidedWorkspaceContext.Provider value={value}>{children}</GuidedWorkspaceContext.Provider>
  );
}

export function useGuidedWorkspace() {
  const ctx = useContext(GuidedWorkspaceContext);
  if (!ctx) throw new Error('useGuidedWorkspace must be used within GuidedWorkspaceProvider');
  return ctx;
}

export function useGuidedWorkspaceOptional() {
  return useContext(GuidedWorkspaceContext);
}
