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

  if (!compositeView) return null;

  return (
    <div className="form-panel inspector-body inspector-body-composite">
      {compositeView.entries.map((entry) => (
        <div key={entry.view.type} className="inspector-composite-block">
          <InspectorHeaderSlot
            title={entry.view.title}
            subtitle={entry.view.subtitle}
            typeLabel={entry.view.type}
          />
          {entry.view.groups.map((group) => (
            <InspectorSection
              key={`${entry.view.type}-${group.definition.id}`}
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
                    {property.render(entry.selection.context)}
                  </div>
                ) : (
                  <InspectorProperty key={property.id} id={property.id} label={property.label}>
                    {property.render(entry.selection.context)}
                  </InspectorProperty>
                ),
              )}
            </InspectorSection>
          ))}
          {entry.view.footer ? <footer className="inspector-footer">{entry.view.footer}</footer> : null}
        </div>
      ))}
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
