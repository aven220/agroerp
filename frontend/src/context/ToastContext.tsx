import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
  undoLabel?: string;
  onUndo?: () => void;
}

interface ToastActions {
  toast: (opts: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastActionsContext = createContext<ToastActions | null>(null);

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  return (
    <div className={`ds-toast ds-toast-${item.variant}`} role="alert" aria-live="polite">
      <span className="ds-toast-icon" aria-hidden>{ICONS[item.variant]}</span>
      <div className="ds-toast-content">
        {item.title ? <div className="ds-toast-title">{item.title}</div> : null}
        <div className="ds-toast-message">
          {item.message}
          {item.onUndo ? (
            <button
              type="button"
              className="ds-toast-undo"
              onClick={() => { item.onUndo?.(); onDismiss(); }}
            >
              {item.undoLabel ?? 'Deshacer'}
            </button>
          ) : null}
        </div>
      </div>
      <button type="button" className="ds-toast-close" onClick={onDismiss} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = opts.duration ?? 4500;
    setToasts((prev) => [...prev, { ...opts, id }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const success = useCallback((message: string, title?: string) => {
    toast({ variant: 'success', message, title });
  }, [toast]);

  const error = useCallback((message: string, title?: string) => {
    toast({ variant: 'error', message, title, duration: 6000 });
  }, [toast]);

  const warning = useCallback((message: string, title?: string) => {
    toast({ variant: 'warning', message, title });
  }, [toast]);

  const info = useCallback((message: string, title?: string) => {
    toast({ variant: 'info', message, title });
  }, [toast]);

  const actions = useMemo(
    () => ({ toast, success, error, warning, info, dismiss }),
    [toast, success, error, warning, info, dismiss],
  );

  return (
    <ToastActionsContext.Provider value={actions}>
      {children}
      <div className="ds-toast-container" aria-label="Notificaciones">
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastActionsContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastActionsContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
