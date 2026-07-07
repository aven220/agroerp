import type { FormFieldDefinition } from '../../api/forms';
import type {
  FormLayoutChild,
  FormLayoutMatrixNode,
  FormLayoutNode,
  FormLayoutRepeatGroupNode,
  FormLayoutSectionNode,
  FormLayoutTabNode,
  FormLayoutTabsNode,
} from './layout-types';

export function isLayoutNode(child: FormLayoutChild): child is FormLayoutNode {
  return typeof child === 'object' && child !== null && 'type' in child;
}

export function childKeys(children: FormLayoutChild[] = []): string[] {
  return children.filter((c): c is string => typeof c === 'string');
}

export function collectLayoutFieldKeys(nodes: FormLayoutNode[]): Set<string> {
  const keys = new Set<string>();
  const walk = (node: FormLayoutNode) => {
    if (node.type === 'field' || node.type === 'repeat_group' || node.type === 'matrix') {
      keys.add(node.key);
    }
    const kids =
      node.type === 'tabs'
        ? node.children
        : node.type === 'tab'
          ? node.children
          : 'children' in node
            ? (node.children ?? [])
            : [];
    for (const child of kids) {
      if (typeof child === 'string') keys.add(child);
      else walk(child);
    }
  };
  for (const node of nodes) walk(node);
  return keys;
}

export function unassignedFieldKeys(fields: FormFieldDefinition[], layout: FormLayoutNode[]): string[] {
  const used = collectLayoutFieldKeys(layout);
  return fields
    .map((f) => f.key)
    .filter((key) => !used.has(key) && !fields.some((f) => f.fields?.some((sub) => sub.key === key)));
}

export function buildFlatLayoutFromFields(fields: FormFieldDefinition[]): FormLayoutNode[] {
  return fields
    .filter((f) => f.type !== 'hidden')
    .map((f) => ({ type: 'field' as const, key: f.key, title: f.label }));
}

export function effectiveLayout(
  layout: FormLayoutNode[] | undefined,
  fields: FormFieldDefinition[],
): FormLayoutNode[] {
  if (layout && layout.length > 0) return layout;
  return buildFlatLayoutFromFields(fields);
}

export function syncRepeatGroupField(
  node: FormLayoutRepeatGroupNode,
  field: FormFieldDefinition | undefined,
): FormFieldDefinition {
  const base: FormFieldDefinition = field ?? {
    key: node.key,
    type: 'repeat_group',
    label: node.title ?? node.key,
    fields: [],
  };
  return {
    ...base,
    type: 'repeat_group',
    label: node.title ?? base.label,
    validation: {
      ...base.validation,
      min: node.min ?? base.validation?.min ?? 0,
      max: node.max ?? base.validation?.max ?? 20,
    },
    metadata: {
      ...base.metadata,
      min: node.min ?? base.metadata?.min,
      max: node.max ?? base.metadata?.max,
    },
  };
}

export function syncMatrixField(
  node: FormLayoutMatrixNode,
  field: FormFieldDefinition | undefined,
): FormFieldDefinition {
  const base: FormFieldDefinition = field ?? {
    key: node.key,
    type: 'matrix',
    label: node.title ?? node.key,
    options: node.columns,
  };
  return {
    ...base,
    type: 'matrix',
    label: node.title ?? base.label,
    options: node.columns,
    matrix: {
      rows: node.rows,
      columns: node.columns.map((c) => c.value),
    },
    metadata: {
      ...base.metadata,
      rows: node.rows,
      responseType: node.responseType ?? 'select',
    },
  };
}

export function createSectionNode(
  kind: 'section' | 'accordion',
  title: string,
  children: string[] = [],
): FormLayoutSectionNode {
  const slug = title.toLowerCase().replace(/\s+/g, '_').slice(0, 24);
  return {
    type: kind,
    key: `${kind}_${slug}_${Date.now().toString(36)}`,
    title,
    children,
  };
}

export function createTabsNode(title = 'Pestañas'): FormLayoutTabsNode {
  return {
    type: 'tabs',
    key: `tabs_${Date.now().toString(36)}`,
    title,
    children: [
      { type: 'tab', key: `tab_${Date.now().toString(36)}`, title: 'Pestaña 1', children: [] },
    ],
  };
}

export function createRepeatGroupNode(
  key: string,
  title: string,
  min = 0,
  max = 20,
): FormLayoutRepeatGroupNode {
  return { type: 'repeat_group', key, title, min, max, children: [] };
}

export function createMatrixNode(key: string, title: string): FormLayoutMatrixNode {
  return {
    type: 'matrix',
    key,
    title,
    rows: ['Criterio 1', 'Criterio 2'],
    columns: [
      { value: '1', label: 'Bajo' },
      { value: '2', label: 'Medio' },
      { value: '3', label: 'Alto' },
    ],
    responseType: 'select',
  };
}

export function defaultRepeatGroupField(key: string, title: string, min = 0, max = 20): FormFieldDefinition {
  return {
    key,
    type: 'repeat_group',
    label: title,
    validation: { min, max },
    fields: [
      { key: `${key}_item`, type: 'text', label: 'Ítem' },
      { key: `${key}_valor`, type: 'number', label: 'Valor' },
    ],
  };
}

export function defaultMatrixField(key: string, title: string): FormFieldDefinition {
  const rows = ['Sanidad', 'Nutrición', 'Manejo'];
  const columns = [
    { value: '1', label: 'Deficiente' },
    { value: '2', label: 'Regular' },
    { value: '3', label: 'Bueno' },
    { value: '4', label: 'Excelente' },
  ];
  return {
    key,
    type: 'matrix',
    label: title,
    options: columns,
    matrix: { rows, columns: columns.map((c) => c.value) },
    metadata: { rows, responseType: 'select' },
  };
}

export function updateLayoutNode(
  layout: FormLayoutNode[],
  index: number,
  patch: Partial<FormLayoutNode>,
): FormLayoutNode[] {
  return layout.map((node, i) => (i === index ? ({ ...node, ...patch } as FormLayoutNode) : node));
}

export function removeLayoutNode(layout: FormLayoutNode[], index: number): FormLayoutNode[] {
  return layout.filter((_, i) => i !== index);
}

export function moveLayoutNode(layout: FormLayoutNode[], index: number, dir: -1 | 1): FormLayoutNode[] {
  const next = index + dir;
  if (next < 0 || next >= layout.length) return layout;
  const copy = [...layout];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

export function updateTabNode(
  layout: FormLayoutNode[],
  tabsIndex: number,
  tabIndex: number,
  patch: Partial<FormLayoutTabNode>,
): FormLayoutNode[] {
  return layout.map((node, i) => {
    if (i !== tabsIndex || node.type !== 'tabs') return node;
    return {
      ...node,
      children: node.children.map((tab, j) => (j === tabIndex ? { ...tab, ...patch } : tab)),
    };
  });
}

export function addChildToSection(
  node: FormLayoutSectionNode,
  fieldKey: string,
): FormLayoutSectionNode {
  if (node.children.includes(fieldKey)) return node;
  return { ...node, children: [...node.children, fieldKey] };
}

export function removeChildFromSection(
  node: FormLayoutSectionNode,
  fieldKey: string,
): FormLayoutSectionNode {
  return { ...node, children: node.children.filter((c) => c !== fieldKey) };
}
