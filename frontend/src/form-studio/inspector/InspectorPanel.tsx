import { useState } from 'react';
import { InspectorProvider, useInspectorContext } from './InspectorContext';
import { InspectorFooter } from './InspectorFooter';
import { InspectorHeader, InspectorHeaderSlot } from './InspectorHeader';
import { InspectorProperty } from './InspectorProperty';
import { InspectorSection } from './InspectorSection';
import { InspectorTabs } from './InspectorTabs';
import type { InspectorSelection } from './types';

function InspectorViewBody() {
  const { selection, view, activeGroupId } = useInspectorContext();

  if (!selection || !view) return null;

  const visibleGroups =
    view.groups.length > 1 && activeGroupId
      ? view.groups.filter((group) => group.definition.id === activeGroupId)
      : view.groups;

  return (
    <>
      {visibleGroups.map((group) => (
        <InspectorSection
          key={`${view.type}-${group.definition.id}`}
          group={group.definition}
          defaultCollapsed={group.definition.collapsed}
        >
          {group.properties.map((property) =>
            property.presentation === 'raw' ? (
              <div
                key={property.id}
                className="inspector-property-raw"
                data-inspector-property={property.id}
              >
                {property.render(selection.context)}
              </div>
            ) : (
              <InspectorProperty key={property.id} id={property.id} label={property.label}>
                {property.render(selection.context)}
              </InspectorProperty>
            ),
          )}
        </InspectorSection>
      ))}
      <InspectorFooter />
    </>
  );
}

function CompositeInspectorBody() {
  const { compositeView } = useInspectorContext();
  const [activeType, setActiveType] = useState<string | null>(null);

  if (!compositeView) return null;

  const entries = compositeView.entries;
  const currentType = activeType ?? entries[0]?.view.type ?? null;
  const activeEntry = entries.find((e) => e.view.type === currentType) ?? entries[0];

  const TAB_LABELS: Record<string, string> = {
    CAPTURE: 'Captura',
    ERP_MAPPING: 'Destino',
    WORKFLOW: 'Aprobaciones',
  };

  return (
    <div className="form-panel inspector-body inspector-body-composite">
      {entries.length > 1 ? (
        <nav className="inspector-composite-tabs" aria-label="Secciones de configuración">
          {entries.map((entry) => (
            <button
              key={entry.view.type}
              type="button"
              className={`inspector-composite-tab${currentType === entry.view.type ? ' active' : ''}`}
              onClick={() => setActiveType(entry.view.type)}
              aria-selected={currentType === entry.view.type}
            >
              {TAB_LABELS[entry.view.type] ?? entry.view.title}
            </button>
          ))}
        </nav>
      ) : null}

      {activeEntry ? (
        <div key={activeEntry.view.type} className="inspector-composite-block">
          <InspectorHeaderSlot
            title={activeEntry.view.title}
            subtitle={activeEntry.view.subtitle}
          />
          {activeEntry.view.groups.map((group) => (
            <InspectorSection
              key={`${activeEntry.view.type}-${group.definition.id}`}
              group={group.definition}
              defaultCollapsed={group.definition.collapsed}
            >
              {group.properties.map((property) =>
                property.presentation === 'raw' ? (
                  <div
                    key={property.id}
                    className="inspector-property-raw"
                    data-inspector-property={property.id}
                  >
                    {property.render(activeEntry.selection.context)}
                  </div>
                ) : (
                  <InspectorProperty key={property.id} id={property.id} label={property.label}>
                    {property.render(activeEntry.selection.context)}
                  </InspectorProperty>
                ),
              )}
            </InspectorSection>
          ))}
          {activeEntry.view.footer ? (
            <footer className="inspector-footer">{activeEntry.view.footer}</footer>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InspectorBody() {
  const { compositeView, selections } = useInspectorContext();

  if (!compositeView) return null;

  if (selections.length > 1) {
    return <CompositeInspectorBody />;
  }

  return (
    <div className="form-panel inspector-body">
      <InspectorViewBody />
    </div>
  );
}

function InspectorContent({ emptyMessage }: { emptyMessage: string }) {
  const { compositeView, selections } = useInspectorContext();

  if (!compositeView || selections.length === 0) {
    return <p className="muted inspector-empty">{emptyMessage}</p>;
  }

  if (selections.length === 1) {
    return (
      <>
        <InspectorHeader />
        <InspectorTabs />
        <InspectorBody />
      </>
    );
  }

  return (
    <>
      <InspectorHeaderSlot title={compositeView.title} subtitle={compositeView.subtitle} />
      <InspectorBody />
    </>
  );
}

export interface InspectorPanelProps<TContext = unknown> {
  selection?: InspectorSelection<TContext> | null;
  selections?: InspectorSelection<TContext>[];
  variant?: 'design' | 'layout';
  emptyMessage?: string;
  className?: string;
}

export function InspectorPanel<TContext>({
  selection = null,
  selections,
  variant = 'design',
  emptyMessage = 'Seleccione un elemento para editar sus propiedades.',
  className = '',
}: InspectorPanelProps<TContext>) {
  const panelClassName = [
    'panel',
    'inspector-panel',
    variant === 'design' ? 'designer-inspector' : 'layout-inspector-panel',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={panelClassName}>
      <InspectorProvider selection={selection} selections={selections}>
        <InspectorContent emptyMessage={emptyMessage} />
      </InspectorProvider>
    </aside>
  );
}
