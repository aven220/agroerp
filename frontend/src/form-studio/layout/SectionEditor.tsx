import type { FormFieldDefinition } from '../../api/forms';
import type { FormLayoutSectionNode } from './layout-types';
import { childKeys } from './layout-utils';

interface Props {
  node: FormLayoutSectionNode;
  fields: FormFieldDefinition[];
  availableKeys: string[];
  disabled?: boolean;
  onChange: (node: FormLayoutSectionNode) => void;
}

export function SectionEditor({ node, fields, availableKeys, disabled, onChange }: Props) {
  const assigned = childKeys(node.children);
  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  function toggleKey(key: string) {
    if (disabled) return;
    const next = assigned.includes(key)
      ? node.children.filter((c) => c !== key)
      : [...node.children, key];
    onChange({ ...node, children: next });
  }

  function moveKey(key: string, dir: -1 | 1) {
    const idx = assigned.indexOf(key);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= assigned.length) return;
    const order = [...assigned];
    [order[idx], order[next]] = [order[next], order[idx]];
    onChange({ ...node, children: order });
  }

  return (
    <div className="layout-section-editor">
      <div className="form-group">
        <label>Título</label>
        <input
          value={node.title ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...node, title: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <textarea
          rows={2}
          value={node.description ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...node, description: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Campos en {node.type === 'accordion' ? 'acordeón' : 'sección'}</label>
        <div className="layout-child-list">
          {assigned.length === 0 && <p className="muted">Sin campos asignados.</p>}
          {assigned.map((key) => {
            const field = fieldMap.get(key);
            return (
              <div key={key} className="layout-child-row">
                <span>{field?.label ?? key} <span className="muted">({field?.type ?? '?'})</span></span>
                <div className="row-actions">
                  <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => moveKey(key, -1)}>↑</button>
                  <button type="button" className="btn btn-sm" disabled={disabled} onClick={() => moveKey(key, 1)}>↓</button>
                  <button type="button" className="btn btn-sm btn-danger" disabled={disabled} onClick={() => toggleKey(key)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {availableKeys.length > 0 && (
        <div className="form-group">
          <label>Agregar campo</label>
          <div className="layout-available-keys">
            {availableKeys.map((key) => {
              const field = fieldMap.get(key);
              return (
                <button
                  key={key}
                  type="button"
                  className="btn btn-sm"
                  disabled={disabled}
                  onClick={() => toggleKey(key)}
                >
                  + {field?.label ?? key}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
