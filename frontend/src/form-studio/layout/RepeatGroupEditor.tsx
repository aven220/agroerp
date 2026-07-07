import type { FormFieldDefinition } from '../../api/forms';
import type { FormLayoutRepeatGroupNode } from './layout-types';

interface Props {
  node: FormLayoutRepeatGroupNode;
  field: FormFieldDefinition | undefined;
  disabled?: boolean;
  onChangeNode: (node: FormLayoutRepeatGroupNode) => void;
  onChangeField: (field: FormFieldDefinition) => void;
}

export function RepeatGroupEditor({
  node,
  field,
  disabled,
  onChangeNode,
  onChangeField,
}: Props) {
  const nested = field?.fields ?? [];
  const min = node.min ?? field?.validation?.min ?? 0;
  const max = node.max ?? field?.validation?.max ?? 20;

  function updateNested(idx: number, patch: Partial<FormFieldDefinition>) {
    if (!field) return;
    onChangeField({
      ...field,
      fields: nested.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  }

  function addNested() {
    if (!field) return;
    const key = `${node.key}_campo_${nested.length + 1}`;
    onChangeField({
      ...field,
      fields: [...nested, { key, type: 'text', label: `Campo ${nested.length + 1}` }],
    });
  }

  function removeNested(idx: number) {
    if (!field) return;
    onChangeField({ ...field, fields: nested.filter((_, i) => i !== idx) });
  }

  return (
    <div className="layout-repeat-editor">
      <div className="form-row">
        <div className="form-group">
          <label>Título del grupo</label>
          <input
            value={node.title ?? field?.label ?? ''}
            disabled={disabled}
            onChange={(e) => {
              onChangeNode({ ...node, title: e.target.value });
              if (field) onChangeField({ ...field, label: e.target.value });
            }}
          />
        </div>
        <div className="form-group">
          <label>Clave</label>
          <input value={node.key} disabled />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Mínimo filas</label>
          <input
            type="number"
            min={0}
            value={min}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChangeNode({ ...node, min: v });
              if (field) {
                onChangeField({
                  ...field,
                  validation: { ...field.validation, min: v },
                  metadata: { ...field.metadata, min: v },
                });
              }
            }}
          />
        </div>
        <div className="form-group">
          <label>Máximo filas</label>
          <input
            type="number"
            min={1}
            value={max}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChangeNode({ ...node, max: v });
              if (field) {
                onChangeField({
                  ...field,
                  validation: { ...field.validation, max: v },
                  metadata: { ...field.metadata, max: v },
                });
              }
            }}
          />
        </div>
      </div>
      <div className="form-group">
        <div className="layout-config-header">
          <label>Campos hijos</label>
          <button type="button" className="btn btn-sm" disabled={disabled || !field} onClick={addNested}>
            + Campo hijo
          </button>
        </div>
        {nested.length === 0 ? (
          <p className="muted">Agregue campos que se repetirán en cada fila.</p>
        ) : (
          <div className="layout-child-list">
            {nested.map((sub, idx) => (
              <div key={`${sub.key}-${idx}`} className="layout-child-row">
                <input
                  value={sub.label}
                  disabled={disabled}
                  onChange={(e) => updateNested(idx, { label: e.target.value })}
                />
                <select
                  value={sub.type}
                  disabled={disabled}
                  onChange={(e) => updateNested(idx, { type: e.target.value })}
                >
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                  <option value="select">Lista</option>
                  <option value="date">Fecha</option>
                  <option value="boolean">Sí/No</option>
                </select>
                <input
                  value={sub.key}
                  disabled={disabled}
                  onChange={(e) => updateNested(idx, { key: e.target.value })}
                  placeholder="clave"
                />
                <button type="button" className="btn btn-sm btn-danger" disabled={disabled} onClick={() => removeNested(idx)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
