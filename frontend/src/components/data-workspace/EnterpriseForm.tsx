import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Tabs, type TabItem } from '../ui/Tabs';
import { Progress } from '../ui/Progress';
import { LoadingState } from '../ux/LoadingState';
import { useFormSaveShortcut } from '../../hooks/useFormSaveShortcut';

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

interface EnterpriseFormProps {
  title?: string;
  sections?: FormSection[];
  tabs?: TabItem[];
  children?: ReactNode;
  progress?: number;
  dirty?: boolean;
  loading?: boolean;
  autosave?: boolean;
  autosaveIntervalMs?: number;
  onAutosave?: () => void | Promise<void>;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  footerExtra?: ReactNode;
}

export function EnterpriseForm({
  title,
  sections,
  tabs,
  children,
  progress,
  dirty,
  loading,
  autosave,
  autosaveIntervalMs = 30000,
  onAutosave,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  footerExtra,
}: EnterpriseFormProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections?.forEach((s) => { init[s.id] = s.defaultOpen === false; });
    return init;
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const runAutosave = useCallback(async () => {
    if (!onAutosave || !dirty) return;
    await onAutosave();
    setLastSaved(new Date());
  }, [onAutosave, dirty]);

  useEffect(() => {
    if (!autosave || !onAutosave) return;
    const id = setInterval(runAutosave, autosaveIntervalMs);
    return () => clearInterval(id);
  }, [autosave, autosaveIntervalMs, runAutosave, onAutosave]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useFormSaveShortcut(() => {
    if (onSubmit && !loading) onSubmit();
  }, Boolean(onSubmit));

  return (
    <div className={`edw-form${dirty ? ' edw-form-dirty' : ''}`}>
      {title ? <h2 className="edw-form-title ds-h2">{title}</h2> : null}
      {progress != null ? (
        <div className="edw-form-progress">
          <Progress value={progress} label={`Progreso del formulario · ${progress}%`} />
        </div>
      ) : null}
      {dirty ? (
        <div className="edw-form-dirty-banner alert alert-warn" role="status">
          Hay cambios sin guardar
          {lastSaved ? <span className="ds-caption"> · Último autoguardado: {lastSaved.toLocaleTimeString('es-CO')}</span> : null}
        </div>
      ) : null}
      {loading ? <LoadingState variant="page" message="Cargando formulario…" rows={4} /> : null}
      {tabs ? <Tabs items={tabs} /> : null}
      {sections ? (
        <div className="edw-form-sections">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.id];
            return (
              <section key={section.id} className="edw-form-section form-section">
                <button
                  type="button"
                  className="edw-form-section-header"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                >
                  <span>{isCollapsed ? '▸' : '▾'} {section.title}</span>
                  {section.description ? <span className="ds-caption">{section.description}</span> : null}
                </button>
                {!isCollapsed ? <div className="edw-form-section-body">{section.content}</div> : null}
              </section>
            );
          })}
        </div>
      ) : null}
      {children}
      <div className="form-actions edw-form-actions">
        {footerExtra}
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
        ) : null}
        {onSubmit ? (
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={loading}>
            {submitLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
