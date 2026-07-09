import { useId, useRef, useState } from 'react';
import { ADMIN_HELP_TOPICS, type AdminHelpTopicId } from '../../lib/adminLabels';

interface ContextHelpProps {
  topic: AdminHelpTopicId;
  label?: string;
}

export function ContextHelp({ topic, label = 'Ayuda' }: ContextHelpProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const topicData = ADMIN_HELP_TOPICS[topic];

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <span className="admin-context-help">
      <button
        ref={buttonRef}
        type="button"
        className="admin-context-help-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>?</span>
        <span className="sr-only">{label}: {topicData.title}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          className="admin-context-help-panel"
          role="dialog"
          aria-label={topicData.title}
        >
          <header className="admin-context-help-head">
            <strong>{topicData.title}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={close}
              aria-label="Cerrar ayuda"
            >
              ✕
            </button>
          </header>
          <p>{topicData.body}</p>
        </div>
      ) : null}
    </span>
  );
}
