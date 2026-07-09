import { useGuidedWorkspaceOptional } from '../../context/GuidedWorkspaceContext';
import type { GuidedRecordKind } from '../../lib/guidedWorkspace';

interface PinRecordButtonProps {
  kind: GuidedRecordKind;
  id: string;
  label: string;
  to: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function PinRecordButton({
  kind,
  id,
  label,
  to,
  className = '',
  size = 'sm',
}: PinRecordButtonProps) {
  const gw = useGuidedWorkspaceOptional();
  if (!gw) return null;

  const pinned = gw.isPinned(kind, id);

  return (
    <button
      type="button"
      className={`pin-record-btn pin-record-btn-${size}${pinned ? ' pinned' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => {
        if (pinned) {
          gw.unpin(kind, id);
        } else {
          gw.pin({ kind, id, label, to });
          gw.setPanelOpen(true);
        }
      }}
      aria-pressed={pinned}
      aria-label={pinned ? `Quitar ${label} del espacio de trabajo` : `Fijar ${label} en el espacio de trabajo`}
      title={pinned ? 'Quitar del espacio de trabajo' : 'Fijar en mi espacio de trabajo'}
    >
      {pinned ? '📌' : '☆'}
      <span className="pin-record-label">{pinned ? 'Fijado' : 'Fijar'}</span>
    </button>
  );
}
