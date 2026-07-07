import { useState } from 'react';
import { LoadingState } from '../../components/ux/LoadingState';
import { useRecordExplorer } from '../hooks/useRecordExplorer';
import { DEFAULT_URE_WIDGETS } from './widget-registry';
import { URE_NAV_SECTIONS } from '../types';
import type { UreWidgetDefinition } from './widget-registry';

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

  function scrollToSection(anchor: string, sectionId: typeof activeSection) {
    setActiveSection(sectionId);
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return <LoadingState variant="page" message="Cargando expediente universal..." />;
  }

  if (error || !data) {
    return <div className="alert alert-error">{error ?? 'Registro no encontrado'}</div>;
  }

  return (
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
          {widgets.map((widget) => {
            const Widget = widget.render;
            return (
              <div key={widget.id} className="ure-widget-slot">
                <Widget data={data} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
