import type { FormFieldDefinition } from '../../api/forms';
import type { FormLayoutMatrixNode, FormMatrixResponseType } from './layout-types';

const RESPONSE_TYPES: Array<{ value: FormMatrixResponseType; label: string }> = [
  { value: 'select', label: 'Lista desplegable' },
  { value: 'radio', label: 'Opción única (radio)' },
  { value: 'number', label: 'Número' },
  { value: 'text', label: 'Texto' },
  { value: 'checkbox', label: 'Casilla' },
];

interface Props {
  node: FormLayoutMatrixNode;
  field: FormFieldDefinition | undefined;
  disabled?: boolean;
  onChangeNode: (node: FormLayoutMatrixNode) => void;
  onChangeField: (field: FormFieldDefinition) => void;
}

export function MatrixEditor({ node, field, disabled, onChangeNode, onChangeField }: Props) {
  function syncBoth(nextNode: FormLayoutMatrixNode) {
    onChangeNode(nextNode);
    if (!field) return;
    onChangeField({
      ...field,
      label: nextNode.title ?? field.label,
      options: nextNode.columns,
      matrix: {
        rows: nextNode.rows,
        columns: nextNode.columns.map((c) => c.value),
      },
      metadata: {
        ...field.metadata,
        rows: nextNode.rows,
        responseType: nextNode.responseType ?? 'select',
      },
    });
  }

  function updateRow(idx: number, value: string) {
    const rows = [...node.rows];
    rows[idx] = value;
    syncBoth({ ...node, rows });
  }

  function addRow() {
    syncBoth({ ...node, rows: [...node.rows, `Criterio ${node.rows.length + 1}`] });
  }

  function removeRow(idx: number) {
    syncBoth({ ...node, rows: node.rows.filter((_, i) => i !== idx) });
  }

  function updateColumn(idx: number, patch: Partial<{ value: string; label: string }>) {
    const columns = node.columns.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    syncBoth({ ...node, columns });
  }

  function addColumn() {
    const n = node.columns.length + 1;
    syncBoth({
      ...node,
      columns: [...node.columns, { value: String(n), label: `Col ${n}` }],
    });
  }

  function removeColumn(idx: number) {
    syncBoth({ ...node, columns: node.columns.filter((_, i) => i !== idx) });
  }

  return (
    <div className="layout-matrix-editor">
      <div className="form-row">
        <div className="form-group">
          <label>Título</label>
          <input
            value={node.title ?? field?.label ?? ''}
            disabled={disabled}
            onChange={(e) => syncBoth({ ...node, title: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Clave</label>
          <input value={node.key} disabled />
        </div>
        <div className="form-group">
          <label>Tipo de respuesta</label>
          <select
            value={node.responseType ?? 'select'}
            disabled={disabled}
            onChange={(e) =>
              syncBoth({ ...node, responseType: e.target.value as FormMatrixResponseType })
            }
          >
            {RESPONSE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <div className="layout-config-header">
          <label>Filas (criterios)</label>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={addRow}>+ Fila</button>
        </div>
        <div className="layout-child-list">
          {node.rows.map((row, idx) => (
            <div key={idx} className="layout-child-row">
              <input value={row} disabled={disabled} onChange={(e) => updateRow(idx, e.target.value)} />
              <button type="button" className="btn btn-sm btn-danger" disabled={disabled} onClick={() => removeRow(idx)}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <div className="layout-config-header">
          <label>Columnas (escala)</label>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={addColumn}>+ Columna</button>
        </div>
        <div className="layout-child-list">
          {node.columns.map((col, idx) => (
            <div key={idx} className="layout-child-row">
              <input
                value={col.label}
                placeholder="Etiqueta"
                disabled={disabled}
                onChange={(e) => updateColumn(idx, { label: e.target.value })}
              />
              <input
                value={col.value}
                placeholder="valor"
                disabled={disabled}
                onChange={(e) => updateColumn(idx, { value: e.target.value })}
              />
              <button type="button" className="btn btn-sm btn-danger" disabled={disabled} onClick={() => removeColumn(idx)}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
