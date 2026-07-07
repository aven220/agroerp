import { useState, type ReactNode } from 'react';
import { FormFieldControl } from '../../components/forms/FormFieldControl';
import type { FormFieldDefinition } from '../../api/forms';
import type { FormLayoutChild, FormLayoutNode } from './layout-types';
import { isLayoutNode } from './layout-utils';

type RenderField = FormFieldDefinition & {
  visible?: boolean;
  effectiveRequired?: boolean;
  computedValue?: unknown;
};

interface Props {
  layout: FormLayoutNode[];
  fieldsByKey: Map<string, RenderField>;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onButtonAction?: (action: string, field: FormFieldDefinition) => void;
}

function FieldBlock({
  field,
  data,
  onChange,
  onButtonAction,
}: {
  field: RenderField | undefined;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onButtonAction?: (action: string, field: FormFieldDefinition) => void;
}) {
  if (!field || field.visible === false) return null;
  return (
    <FormFieldControl
      field={field}
      value={data[field.key]}
      onChange={onChange}
      onButtonAction={onButtonAction}
    />
  );
}

function renderChildren(
  children: FormLayoutChild[],
  fieldsByKey: Map<string, RenderField>,
  data: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void,
  onButtonAction?: (action: string, field: FormFieldDefinition) => void,
): ReactNode {
  return children.map((child, idx) => {
    if (typeof child === 'string') {
      return (
        <FieldBlock
          key={child}
          field={fieldsByKey.get(child)}
          data={data}
          onChange={onChange}
          onButtonAction={onButtonAction}
        />
      );
    }
    return (
      <LayoutNodeRenderer
        key={child.key || String(idx)}
        node={child}
        fieldsByKey={fieldsByKey}
        data={data}
        onChange={onChange}
        onButtonAction={onButtonAction}
      />
    );
  });
}

function LayoutNodeRenderer({
  node,
  fieldsByKey,
  data,
  onChange,
  onButtonAction,
}: Omit<Props, 'layout'> & { node: FormLayoutNode }) {
  const [openTab, setOpenTab] = useState(0);

  if (node.type === 'field' || node.type === 'repeat_group' || node.type === 'matrix') {
    return (
      <FieldBlock
        field={fieldsByKey.get(node.key)}
        data={data}
        onChange={onChange}
        onButtonAction={onButtonAction}
      />
    );
  }

  if (node.type === 'section') {
    return (
      <section className="form-layout-section">
        {node.title && <h3 className="form-layout-section-title">{node.title}</h3>}
        {node.description && <p className="muted">{node.description}</p>}
        <div className="form-layout-section-body">
          {renderChildren(node.children, fieldsByKey, data, onChange, onButtonAction)}
        </div>
      </section>
    );
  }

  if (node.type === 'accordion') {
    return (
      <details className="form-layout-accordion" open>
        <summary>{node.title ?? node.key}</summary>
        {node.description && <p className="muted">{node.description}</p>}
        <div className="form-layout-section-body">
          {renderChildren(node.children, fieldsByKey, data, onChange, onButtonAction)}
        </div>
      </details>
    );
  }

  if (node.type === 'tabs') {
    const tabs = node.children;
    return (
      <div className="form-layout-tabs">
        <div className="form-layout-tab-bar" role="tablist">
          {tabs.map((tab, idx) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={openTab === idx}
              className={`form-layout-tab-btn ${openTab === idx ? 'active' : ''}`}
              onClick={() => setOpenTab(idx)}
            >
              {tab.title}
            </button>
          ))}
        </div>
        {tabs.map((tab, idx) => (
          <div
            key={tab.key}
            role="tabpanel"
            className={`form-layout-tab-panel ${openTab === idx ? 'active' : ''}`}
            hidden={openTab !== idx}
          >
            {renderChildren(tab.children, fieldsByKey, data, onChange, onButtonAction)}
          </div>
        ))}
      </div>
    );
  }

  if (node.type === 'tab') {
    return (
      <div className="form-layout-tab-panel active">
        {renderChildren(node.children, fieldsByKey, data, onChange, onButtonAction)}
      </div>
    );
  }

  return null;
}

export function LayoutRenderer({
  layout,
  fieldsByKey,
  data,
  onChange,
  onButtonAction,
}: Props) {
  return (
    <div className="form-layout-root">
      {layout.map((node) => (
        <LayoutNodeRenderer
          key={node.key}
          node={node}
          fieldsByKey={fieldsByKey}
          data={data}
          onChange={onChange}
          onButtonAction={onButtonAction}
        />
      ))}
    </div>
  );
}

export function buildFieldsMap(fields: RenderField[]): Map<string, RenderField> {
  const map = new Map<string, RenderField>();
  for (const field of fields) {
    map.set(field.key, field);
  }
  return map;
}

export function flattenLayoutFieldOrder(layout: FormLayoutNode[]): string[] {
  const order: string[] = [];
  const walkChild = (child: FormLayoutChild) => {
    if (typeof child === 'string') {
      if (!order.includes(child)) order.push(child);
      return;
    }
    walkNode(child);
  };
  const walkNode = (node: FormLayoutNode) => {
    if (node.type === 'field' || node.type === 'repeat_group' || node.type === 'matrix') {
      if (!order.includes(node.key)) order.push(node.key);
    }
    const kids =
      node.type === 'tabs'
        ? node.children.flatMap((t) => t.children)
        : 'children' in node
          ? (node.children ?? [])
          : [];
    for (const child of kids) {
      if (isLayoutNode(child)) walkNode(child);
      else walkChild(child);
    }
  };
  for (const node of layout) walkNode(node);
  return order;
}
