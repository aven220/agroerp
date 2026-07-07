import { useMemo, useState } from 'react';
import type { FormFieldDefinition } from '../../api/forms';
import { SectionEditor } from './SectionEditor';
import { RepeatGroupEditor } from './RepeatGroupEditor';
import { MatrixEditor } from './MatrixEditor';
import type { FormLayoutNode, FormLayoutTabNode } from './layout-types';
import {
  childKeys,
  createMatrixNode,
  createRepeatGroupNode,
  createSectionNode,
  createTabsNode,
  defaultMatrixField,
  defaultRepeatGroupField,
  moveLayoutNode,
  removeLayoutNode,
  syncMatrixField,
  syncRepeatGroupField,
  unassignedFieldKeys,
  updateLayoutNode,
  updateTabNode,
} from './layout-utils';

interface Props {
  layout: FormLayoutNode[];
  fields: FormFieldDefinition[];
  disabled?: boolean;
  onLayoutChange: (layout: FormLayoutNode[]) => void;
  onFieldsChange: (fields: FormFieldDefinition[]) => void;
}

function nodeLabel(node: FormLayoutNode): string {
  if (node.type === 'tab') return node.title ?? node.key;
  if (node.type === 'tabs') return node.title ?? 'Pestañas';
  return node.title ?? node.key;
}

export function LayoutBuilder({
  layout,
  fields,
  disabled,
  onLayoutChange,
  onFieldsChange,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(layout.length ? 0 : null);
  const [selectedTab, setSelectedTab] = useState<{ tabsIndex: number; tabIndex: number } | null>(null);

  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const available = unassignedFieldKeys(fields, layout);

  const selected = selectedIndex != null ? layout[selectedIndex] : null;
  const tabsParent =
    selectedTab && layout[selectedTab.tabsIndex]?.type === 'tabs'
      ? layout[selectedTab.tabsIndex]
      : null;
  const selectedTabNode =
    tabsParent?.type === 'tabs' ? tabsParent.children[selectedTab!.tabIndex] : null;

  function setField(key: string, field: FormFieldDefinition) {
    onFieldsChange(fields.map((f) => (f.key === key ? field : f)));
  }

  function upsertField(field: FormFieldDefinition) {
    if (fields.some((f) => f.key === field.key)) {
      setField(field.key, field);
    } else {
      onFieldsChange([...fields, field]);
    }
  }

  function handleAdd(kind: FormLayoutNode['type']) {
    if (disabled) return;
    let node: FormLayoutNode;
    const extraFields: FormFieldDefinition[] = [];

    switch (kind) {
      case 'section':
        node = createSectionNode('section', 'Nueva sección', available.slice(0, 2));
        break;
      case 'accordion':
        node = createSectionNode('accordion', 'Nuevo acordeón', available.slice(0, 2));
        break;
      case 'tabs':
        node = createTabsNode('Pestañas del formulario');
        break;
      case 'repeat_group': {
        const key = `grupo_${fields.length + 1}`;
        node = createRepeatGroupNode(key, 'Grupo repetible');
        extraFields.push(defaultRepeatGroupField(key, 'Grupo repetible'));
        break;
      }
      case 'matrix': {
        const key = `matriz_${fields.length + 1}`;
        node = createMatrixNode(key, 'Matriz de evaluación');
        extraFields.push(defaultMatrixField(key, 'Matriz de evaluación'));
        break;
      }
      default:
        return;
    }

    const nextLayout = [...layout, node];
    onLayoutChange(nextLayout);
    if (extraFields.length) onFieldsChange([...fields, ...extraFields]);
    setSelectedIndex(nextLayout.length - 1);
    setSelectedTab(null);
  }

  function handleRemove(index: number) {
    if (disabled) return;
    onLayoutChange(removeLayoutNode(layout, index));
    setSelectedIndex(null);
    setSelectedTab(null);
  }

  function renderInspector() {
    if (selectedTabNode && selectedTab) {
      return (
        <SectionEditor
          node={{ ...selectedTabNode, type: 'section', children: selectedTabNode.children }}
          fields={fields}
          availableKeys={[
            ...available,
            ...childKeys(selectedTabNode.children).filter((k) => !available.includes(k)),
          ]}
          disabled={disabled}
          onChange={(patch) => {
            onLayoutChange(
              updateTabNode(layout, selectedTab.tabsIndex, selectedTab.tabIndex, {
                title: patch.title,
                description: patch.description,
                children: patch.children,
              } as Partial<FormLayoutTabNode>),
            );
          }}
        />
      );
    }

    if (!selected) {
      return <p className="muted">Seleccione un bloque de layout o agregue uno nuevo.</p>;
    }

    if (selected.type === 'section' || selected.type === 'accordion') {
      return (
        <SectionEditor
          node={selected}
          fields={fields}
          availableKeys={[...available, ...childKeys(selected.children)]}
          disabled={disabled}
          onChange={(node) => {
            if (selectedIndex == null) return;
            onLayoutChange(updateLayoutNode(layout, selectedIndex, node));
          }}
        />
      );
    }

    if (selected.type === 'tabs') {
      return (
        <div className="layout-tabs-editor">
          <p className="muted">Seleccione una pestaña en el árbol para asignar campos.</p>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-sm"
              disabled={disabled}
              onClick={() => {
                if (selectedIndex == null) return;
                const tabs = layout[selectedIndex];
                if (tabs.type !== 'tabs') return;
                const tab: FormLayoutTabNode = {
                  type: 'tab',
                  key: `tab_${Date.now().toString(36)}`,
                  title: `Pestaña ${tabs.children.length + 1}`,
                  children: [],
                };
                onLayoutChange(
                  updateLayoutNode(layout, selectedIndex, {
                    children: [...tabs.children, tab],
                  }),
                );
              }}
            >
              + Pestaña
            </button>
          </div>
          <ul className="layout-tab-list">
            {selected.children.map((tab, tabIndex) => (
              <li key={tab.key}>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedTab?.tabIndex === tabIndex ? 'btn-primary' : ''}`}
                  onClick={() => setSelectedTab({ tabsIndex: selectedIndex!, tabIndex })}
                >
                  {tab.title} ({childKeys(tab.children).length})
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (selected.type === 'repeat_group') {
      const field = fieldMap.get(selected.key);
      return (
        <RepeatGroupEditor
          node={selected}
          field={field}
          disabled={disabled}
          onChangeNode={(node) => {
            if (selectedIndex == null) return;
            onLayoutChange(updateLayoutNode(layout, selectedIndex, node));
            upsertField(syncRepeatGroupField(node, field));
          }}
          onChangeField={(f) => upsertField(f)}
        />
      );
    }

    if (selected.type === 'matrix') {
      const field = fieldMap.get(selected.key);
      return (
        <MatrixEditor
          node={selected}
          field={field}
          disabled={disabled}
          onChangeNode={(node) => {
            if (selectedIndex == null) return;
            onLayoutChange(updateLayoutNode(layout, selectedIndex, node));
            upsertField(syncMatrixField(node, field));
          }}
          onChangeField={(f) => upsertField(f)}
        />
      );
    }

    return <p className="muted">Referencia a campo: {selected.key}</p>;
  }

  return (
    <div className="layout-builder">
      <div className="layout-builder-toolbar panel">
        <h3>Layout Engine</h3>
        <p className="muted">Estructura visual avanzada. Los campos siguen en <code>schema.fields</code>.</p>
        <div className="row-actions">
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => handleAdd('section')}>+ Sección</button>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => handleAdd('accordion')}>+ Acordeón</button>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => handleAdd('tabs')}>+ Pestañas</button>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => handleAdd('repeat_group')}>+ Grupo repetible</button>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => handleAdd('matrix')}>+ Matriz</button>
        </div>
        {available.length > 0 && (
          <p className="muted">Campos sin asignar: {available.join(', ')}</p>
        )}
      </div>

      <div className="layout-builder-body designer-layout">
        <section className="panel layout-tree-panel">
          <h4>Árbol de layout ({layout.length})</h4>
          {layout.length === 0 ? (
            <p className="muted">Sin layout definido — la vista previa usará lista plana de campos.</p>
          ) : (
            <ul className="layout-tree">
              {layout.map((node, index) => (
                <li key={node.key}>
                  <div
                    className={`layout-tree-item ${selectedIndex === index && !selectedTab ? 'selected' : ''}`}
                    onClick={() => { setSelectedIndex(index); setSelectedTab(null); }}
                  >
                    <span className="layout-tree-type">{node.type}</span>
                    <strong>{nodeLabel(node)}</strong>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => onLayoutChange(moveLayoutNode(layout, index, -1))}>↑</button>
                      <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => onLayoutChange(moveLayoutNode(layout, index, 1))}>↓</button>
                      <button type="button" className="btn btn-sm btn-danger" disabled={disabled} onClick={() => handleRemove(index)}>×</button>
                    </div>
                  </div>
                  {node.type === 'tabs' && (
                    <ul className="layout-tree nested">
                      {node.children.map((tab, tabIndex) => (
                        <li
                          key={tab.key}
                          className={`layout-tree-item nested ${selectedTab?.tabsIndex === index && selectedTab.tabIndex === tabIndex ? 'selected' : ''}`}
                          onClick={() => { setSelectedIndex(index); setSelectedTab({ tabsIndex: index, tabIndex }); }}
                        >
                          <span className="layout-tree-type">tab</span>
                          {tab.title} ({childKeys(tab.children).length})
                        </li>
                      ))}
                    </ul>
                  )}
                  {(node.type === 'section' || node.type === 'accordion') && (
                    <p className="muted layout-tree-meta">{childKeys(node.children).join(' · ') || 'vacío'}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="panel layout-inspector-panel">
          <h4>Configuración</h4>
          {renderInspector()}
        </aside>
      </div>
    </div>
  );
}
