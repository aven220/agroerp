import { useEffect } from 'react';

/**
 * Listens for the global ⌘S / Ctrl+S shortcut (agroerp:save) and triggers save.
 */
export function useFormSaveShortcut(onSave: () => void | Promise<void>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: Event) => {
      event.preventDefault();
      void onSave();
    };

    window.addEventListener('agroerp:save', handler);
    return () => window.removeEventListener('agroerp:save', handler);
  }, [onSave, enabled]);
}
