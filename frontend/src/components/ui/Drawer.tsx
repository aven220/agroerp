import { useEffect, type ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

export function Drawer({ open, onClose, title, children, side = 'right' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="ds-drawer-backdrop" onClick={onClose} role="presentation" />
      <aside
        className={`ds-drawer ds-drawer-${side}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="ds-drawer-header">
          <h2 className="ds-h3">{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="ds-drawer-body">{children}</div>
      </aside>
    </>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="ds-confirm-overlay" role="presentation" onClick={onCancel}>
      <div className="ds-confirm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-labelledby="confirm-title">
        <div id="confirm-title" className="ds-confirm-title">{title}</div>
        <p className="ds-confirm-message">{message}</p>
        <div className="ds-confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            type="button"
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
