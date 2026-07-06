import type { FormFieldDefinition } from '../../api/forms';

const OPTION_TYPES = new Set(['select', 'multi_select', 'radio', 'checkbox']);

export function fieldTypeUsesOptions(type: string): boolean {
  return OPTION_TYPES.has(type);
}

export const DEFAULT_FIELD_OPTIONS: FormFieldDefinition['options'] = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
];

interface Props {
  options: FormFieldDefinition['options'];
  onChange: (options: FormFieldDefinition['options']) => void;
}

export function FieldOptionsEditor({ options, onChange }: Props) {
  const rows = options?.length ? options : [{ value: '', label: '' }];

  function updateRow(index: number, patch: Partial<{ value: string; label: string }>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next.filter((r) => r.value.trim() || r.label.trim()));
  }

  function addRow() {
    onChange([...rows, { value: `opcion_${rows.length + 1}`, label: `Opción ${rows.length + 1}` }]);
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ value: 'si', label: 'Sí' }]);
  }

  return (
    <div className="form-group">
      <label>Opciones de respuesta</label>
      <p className="muted" style={{ marginBottom: 8 }}>
        Defina las opciones que verá el usuario. En selección múltiple y casillas puede elegir varias.
      </p>
      {rows.map((row, index) => (
        <div key={index} className="form-row" style={{ marginBottom: 8, alignItems: 'center' }}>
          <input
            placeholder="Valor (interno)"
            value={row.value}
            onChange={(e) => updateRow(index, { value: e.target.value })}
            style={{ flex: 1 }}
          />
          <input
            placeholder="Etiqueta visible"
            value={row.label}
            onChange={(e) => updateRow(index, { label: e.target.value })}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(index)} title="Quitar">
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={addRow}>
        + Agregar opción
      </button>
    </div>
  );
}
