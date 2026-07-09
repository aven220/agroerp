import { useMemo, useState, useCallback, useEffect } from 'react';
import { LoadingState } from '../../components/ux/LoadingState';
import { useRecordExplorer } from '../hooks/useRecordExplorer';
import { DEFAULT_URE_WIDGETS } from './widget-registry';
import { URE_NAV_SECTIONS } from '../types';
import type { UreWidgetDefinition } from './widget-registry';
import type { UreRecordExplorerResponse } from '../types';
import {
  registerLegacyWidgets,
  WidgetContextProvider,
  WidgetRenderer,
  useWidgets,
  URE_DEFAULT_LAYOUT_ID,
} from '../../widget-platform';

export interface UniversalRecordExplorerProps {
  entityType: string;
  recordId: string;
  widgets?: UreWidgetDefinition[];
}

export function UniversalRecordExplorer({
  entityType,
  recordId,
  widgets = DEFAULT_URE_WIDGETS,
}: UniversalRecordExplorerProps) {
  const { data, loading, error } = useRecordExplorer(entityType, recordId);
  const [activeSection, setActiveSection] = useState(URE_NAV_SECTIONS[0].id);

  useEffect(() => {
    registerLegacyWidgets<UreRecordExplorerResponse>(widgets);
  }, [widgets]);

  const layoutWidgetIds = useMemo(() => widgets.map((w) => w.id), [widgets]);

  const widgetData = (data ?? {}) as UreRecordExplorerResponse;

  const { widgets: resolvedWidgets } = useWidgets<UreRecordExplorerResponse>({
    data: widgetData,
    layoutId: URE_DEFAULT_LAYOUT_ID,
    layoutWidgetIds,
  });

  const widgetContextValue = useMemo(
    () => ({
      data: data!,
      entityType,
      recordId,
      layoutId: URE_DEFAULT_LAYOUT_ID,
    }),
    [data, entityType, recordId],
  );

  const scrollToSection = useCallback((anchor: string, sectionId: typeof activeSection) => {
    setActiveSection(sectionId);
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (loading) {
    return <LoadingState variant="page" message="Cargando expediente..." />;
  }

  if (error || !data) {
    return <div className="alert alert-error">{error ?? 'Registro no encontrado'}</div>;
  }

  return (
    <WidgetContextProvider value={widgetContextValue}>
      <div className="ure-layout">
        <aside className="ure-sidebar" aria-label="Secciones del expediente">
          <nav>
            <ul className="ure-nav">
              {URE_NAV_SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`ure-nav-item${activeSection === section.id ? ' active' : ''}`}
                    onClick={() => scrollToSection(section.anchor, section.id)}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="ure-panel">
          <div className="ure-widgets">
            <WidgetRenderer
              widgets={resolvedWidgets}
              data={data}
              slotClassName="ure-widget-slot"
              deferUntilVisible
            />
          </div>
        </div>
      </div>
    </WidgetContextProvider>
  );
}
