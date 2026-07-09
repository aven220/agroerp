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

export interface ShortcutDef {
  id: string;
  keys: string[];
  label: string;
  category: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { id: 'search', keys: ['⌘', 'K'], label: 'Launcher de comandos', category: 'Comandos' },
  { id: 'commands', keys: ['⌘', 'Shift', 'P'], label: 'Paleta de comandos', category: 'Comandos' },
  { id: 'help', keys: ['?'], label: 'Atajos de teclado', category: 'Ayuda' },
  { id: 'home', keys: ['⌘', 'H'], label: 'Ir al inicio', category: 'Navegación' },
  { id: 'notifications', keys: ['⌘', 'Shift', 'N'], label: 'Notificaciones', category: 'Navegación' },
  { id: 'favorites', keys: ['⌘', 'Shift', 'F'], label: 'Abrir favoritos', category: 'Navegación' },
  { id: 'save', keys: ['⌘', 'S'], label: 'Guardar formulario', category: 'Acciones' },
  { id: 'cancel', keys: ['Esc'], label: 'Cancelar / cerrar', category: 'Acciones' },
  { id: 'prefs', keys: ['⌘', ','], label: 'Preferencias', category: 'Personalización' },
];

interface KeyboardShortcutsContextValue {
  shortcuts: ShortcutDef[];
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  prefsOpen: boolean;
  setPrefsOpen: (open: boolean) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

function isMod(e: KeyboardEvent) {
  return e.metaKey || e.ctrlKey;
}

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const openCommandPalette = useCallback((mode: 'launcher' | 'commands') => {
    window.dispatchEvent(new CustomEvent('agroerp:command-palette', { detail: { mode } }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === '?' && !inInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (isMod(e) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        openCommandPalette('commands');
        return;
      }

      if (isMod(e) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette('launcher');
        return;
      }

      if (isMod(e) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        navigate('/');
        return;
      }

      if (isMod(e) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/notificaciones');
        return;
      }

      if (isMod(e) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openCommandPalette('launcher');
        return;
      }

      if (isMod(e) && e.key === ',') {
        e.preventDefault();
        setPrefsOpen(true);
        return;
      }

      if (isMod(e) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('agroerp:save'));
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, openCommandPalette]);

  const value = useMemo(
    () => ({ shortcuts: SHORTCUTS, helpOpen, setHelpOpen, prefsOpen, setPrefsOpen }),
    [helpOpen, prefsOpen],
  );

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) throw new Error('useKeyboardShortcuts requires KeyboardShortcutsProvider');
  return ctx;
}
