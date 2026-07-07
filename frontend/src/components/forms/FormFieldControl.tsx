import type { FormFieldDefinition } from '../../api/forms';
import { UDFE_LAYOUT_FIELD_TYPES } from '../../api/forms';

interface Props {
  field: FormFieldDefinition & { visible?: boolean; effectiveRequired?: boolean; computedValue?: unknown };
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
  onButtonAction?: (action: string, field: FormFieldDefinition) => void;
}

const LAYOUT = new Set<string>(UDFE_LAYOUT_FIELD_TYPES);

export function FormFieldControl({ field, value, onChange, readOnly, onButtonAction }: Props) {
  if (field.visible === false) return null;

  if (LAYOUT.has(field.type)) {
    if (field.type === 'heading') return <h4 className="form-section-title">{field.label}</h4>;
    if (field.type === 'separator') return <hr className="form-separator" />;
    if (field.type === 'html') return <div className="form-html" dangerouslySetInnerHTML={{ __html: field.description ?? '' }} />;
    if (field.type === 'markdown') return <pre className="form-markdown">{field.description ?? field.label}</pre>;
    if (field.type === 'indicator') return <div className="score-chip">{field.label}</div>;
    if (field.type === 'hyperlink') {
      const href = String(field.metadata?.url ?? field.description ?? '#');
      return (
        <div className="form-group form-hyperlink-field">
          <a href={href} className="form-hyperlink" target="_blank" rel="noopener noreferrer">
            {field.label}
          </a>
        </div>
      );
    }
    if (field.type === 'button') {
      const action = String(field.metadata?.action ?? field.metadata?.buttonAction ?? 'submit');
      const variant = String(field.metadata?.variant ?? 'primary');
      const disabled = readOnly || field.readOnly;
      return (
        <div className="form-group form-button-field">
          <button
            type="button"
            className={`btn btn-${variant === 'secondary' || variant === 'ghost' ? variant : 'primary'}`}
            disabled={disabled}
            onClick={() => onButtonAction?.(action, field)}
          >
            {field.label}
          </button>
          {field.description ? <small className="muted">{field.description}</small> : null}
        </div>
      );
    }
    if (field.type === 'hidden') return null;
    return null;
  }

  const required = field.effectiveRequired ?? field.required;
  const disabled = readOnly || field.readOnly;

  if (field.type === 'calculated' || field.type === 'derived') {
    return (
      <div className="form-group">
        <label>{field.label}</label>
        <input value={String(field.computedValue ?? value ?? '')} readOnly className="readonly" />
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="form-group form-check">
        <label>
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(field.key, e.target.checked)}
          />
          {field.label}{required ? ' *' : ''}
        </label>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    const opts = field.options ?? [];
    if (opts.length > 0) {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="form-group">
          <label className="form-label-block">{field.label}{required ? ' *' : ''}</label>
          {opts.map((o) => (
            <label key={o.value} className="form-check">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, o.value]
                    : selected.filter((v) => v !== o.value);
                  onChange(field.key, next);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    return (
      <div className="form-group form-check">
        <label>
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(field.key, e.target.checked)}
          />
          {field.label}{required ? ' *' : ''}
        </label>
      </div>
    );
  }

  if (field.type === 'radio') {
    const opts = field.options ?? [];
    return (
      <div className="form-group">
        <label className="form-label-block">{field.label}{required ? ' *' : ''}</label>
        {opts.map((o) => (
          <label key={o.value} className="form-check">
            <input
              type="radio"
              name={field.key}
              value={o.value}
              checked={String(value ?? '') === o.value}
              disabled={disabled}
              onChange={() => onChange(field.key, o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <select
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="">Seleccione...</option>
          {(field.options ?? []).map((o: { value: string; label: string }) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'multi_select') {
    const opts = field.options ?? [];
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="form-group">
        <label className="form-label-block">{field.label}{required ? ' *' : ''}</label>
        {opts.length === 0 ? (
          <p className="muted">Configure las opciones en el diseñador del formulario.</p>
        ) : (
          opts.map((o) => (
            <label key={o.value} className="form-check">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, o.value]
                    : selected.filter((v) => v !== o.value);
                  onChange(field.key, next);
                }}
              />
              {o.label}
            </label>
          ))
        )}
      </div>
    );
  }

  if (field.type === 'autocomplete') {
    const listId = `ac-${field.key}`;
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          list={listId}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
        <datalist id={listId}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.label} />
          ))}
        </datalist>
      </div>
    );
  }

  if (field.type === 'repeat_group' || field.type === 'subform') {
    const nested = field.fields ?? [];
    const min = field.validation?.min ?? Number(field.metadata?.min ?? 0);
    const max = field.validation?.max ?? Number(field.metadata?.max ?? 20);
    const rows: Record<string, unknown>[] = Array.isArray(value)
      ? (value as Record<string, unknown>[])
      : value && typeof value === 'object'
        ? [value as Record<string, unknown>]
        : [];

    function setRows(next: Record<string, unknown>[]) {
      onChange(field.key, next);
    }

    function updateRow(rowIndex: number, subKey: string, val: unknown) {
      const next = rows.map((row, i) => (i === rowIndex ? { ...row, [subKey]: val } : row));
      setRows(next);
    }

    return (
      <fieldset className="form-repeat-group">
        <legend>{field.label}</legend>
        {rows.length === 0 && (
          <p className="muted">Sin filas. Agregue al menos {min > 0 ? min : 'una'}.</p>
        )}
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="form-repeat-row">
            <div className="form-repeat-row-header">
              <strong>Fila {rowIndex + 1}</strong>
              {!disabled && rows.length > min && (
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setRows(rows.filter((_, i) => i !== rowIndex))}>
                  Eliminar
                </button>
              )}
            </div>
            {nested.map((sub) => (
              <FormFieldControl
                key={`${rowIndex}-${sub.key}`}
                field={sub}
                value={row[sub.key]}
                onChange={(_, val) => updateRow(rowIndex, sub.key, val)}
                readOnly={readOnly}
              />
            ))}
          </div>
        ))}
        {!disabled && rows.length < max && (
          <button type="button" className="btn btn-sm" onClick={() => setRows([...rows, {}])}>
            + Agregar fila
          </button>
        )}
        <span className="muted form-repeat-meta">{rows.length} / {max} filas</span>
      </fieldset>
    );
  }

  if (field.type === 'matrix') {
    const rows = field.matrix?.rows ?? (field.metadata?.rows as string[] | undefined) ?? [];
    const columns = field.options ?? [];
    const responseType = String(field.metadata?.responseType ?? 'select');
    const matrixValue = (value as Record<string, Record<string, unknown>> | undefined) ?? {};

    function setCell(rowKey: string, colValue: string, cellValue: unknown) {
      onChange(field.key, {
        ...matrixValue,
        [rowKey]: { ...(matrixValue[rowKey] ?? {}), [colValue]: cellValue },
      });
    }

    return (
      <div className="form-group form-matrix">
        <label>{field.label}{required ? ' *' : ''}</label>
        <div className="form-matrix-scroll">
          <table className="form-matrix-table">
            <thead>
              <tr>
                <th>Criterio</th>
                {columns.map((col) => (
                  <th key={col.value}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowLabel) => {
                const rowKey = rowLabel.toLowerCase().replace(/\s+/g, '_');
                const rowData = matrixValue[rowKey] ?? matrixValue[rowLabel] ?? {};
                return (
                  <tr key={rowLabel}>
                    <td>{rowLabel}</td>
                    {columns.map((col) => (
                      <td key={col.value}>
                        {responseType === 'radio' ? (
                          <input
                            type="radio"
                            name={`${field.key}-${rowKey}`}
                            checked={rowData[col.value] === col.value}
                            disabled={disabled}
                            onChange={() => setCell(rowKey, col.value, col.value)}
                          />
                        ) : responseType === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(rowData[col.value])}
                            disabled={disabled}
                            onChange={(e) => setCell(rowKey, col.value, e.target.checked)}
                          />
                        ) : responseType === 'number' ? (
                          <input
                            type="number"
                            value={rowData[col.value] != null ? String(rowData[col.value]) : ''}
                            disabled={disabled}
                            onChange={(e) => setCell(rowKey, col.value, e.target.value === '' ? undefined : Number(e.target.value))}
                          />
                        ) : responseType === 'text' ? (
                          <input
                            type="text"
                            value={String(rowData[col.value] ?? '')}
                            disabled={disabled}
                            onChange={(e) => setCell(rowKey, col.value, e.target.value)}
                          />
                        ) : (
                          <select
                            value={String(rowData[col.value] ?? '')}
                            disabled={disabled}
                            onChange={(e) => setCell(rowKey, col.value, e.target.value)}
                          >
                            <option value="">—</option>
                            {columns.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (field.metadata?.layout === 'accordion' && field.type === 'html') {
    return (
      <details className="form-accordion">
        <summary>{String(field.metadata?.accordionTitle ?? field.label)}</summary>
        <div className="form-html" dangerouslySetInnerHTML={{ __html: field.description ?? '' }} />
      </details>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <textarea
          rows={4}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </div>
    );
  }

  if (['number', 'integer', 'decimal', 'currency'].includes(field.type)) {
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          type="number"
          step={field.type === 'integer' ? 1 : 'any'}
          value={value != null ? String(value) : ''}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value === '' ? undefined : Number(e.target.value))}
        />
      </div>
    );
  }

  if (['date', 'datetime', 'time'].includes(field.type)) {
    const inputType = field.type === 'datetime' ? 'datetime-local' : field.type;
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          type={inputType}
          value={String(value ?? '')}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </div>
    );
  }

  if (['geo', 'geo_point', 'map'].includes(field.type)) {
    const geo = (value as { lat?: number; lng?: number }) ?? {};
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <div className="form-row">
          <input
            type="number"
            step="0.0000001"
            placeholder="Latitud"
            value={geo.lat ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange(field.key, { ...geo, lat: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <input
            type="number"
            step="0.0000001"
            placeholder="Longitud"
            value={geo.lng ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange(field.key, { ...geo, lng: e.target.value ? Number(e.target.value) : undefined })
            }
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={disabled}
            onClick={() => {
              navigator.geolocation?.getCurrentPosition((pos) => {
                onChange(field.key, {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                });
              });
            }}
          >
            GPS
          </button>
        </div>
      </div>
    );
  }

  if (['photo', 'file', 'pdf', 'signature', 'video', 'audio'].includes(field.type)) {
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          type="file"
          disabled={disabled}
          accept={field.type === 'photo' ? 'image/*' : field.type === 'video' ? 'video/*' : field.type === 'audio' ? 'audio/*' : String(field.metadata?.accept ?? '')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(field.key, crypto.randomUUID());
          }}
        />
        {value ? <span className="muted">Archivo registrado</span> : null}
      </div>
    );
  }

  if (field.type === 'gallery') {
    const files = Array.isArray(value) ? (value as string[]) : value ? [String(value)] : [];
    const max = Number(field.metadata?.maxFiles ?? 10);
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || files.length >= max}
          onChange={(e) => {
            const added = Array.from(e.target.files ?? []).map(() => crypto.randomUUID());
            onChange(field.key, [...files, ...added].slice(0, max));
          }}
        />
        {files.length > 0 && (
          <ul className="form-gallery-list">
            {files.map((id, i) => (
              <li key={id}>
                Foto {i + 1}
                {!disabled && (
                  <button type="button" className="btn btn-sm" onClick={() => onChange(field.key, files.filter((_, j) => j !== i))}>Eliminar</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (field.type === 'rating' || field.type === 'scale' || field.type === 'likert' || field.type === 'emoji') {
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          type="range"
          min={1}
          max={5}
          value={Number(value ?? 3)}
          disabled={disabled}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
        />
        <span>{String(value ?? 3)}</span>
      </div>
    );
  }

  const inputType = String(field.metadata?.inputType ?? 'text');

  return (
    <div className="form-group">
      <label>{field.label}{required ? ' *' : ''}</label>
      <input
        type={inputType === 'color' ? 'color' : inputType}
        value={String(value ?? (inputType === 'color' ? '#2d6a4f' : ''))}
        disabled={disabled}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
      {field.description && inputType !== 'color' && <small className="muted">{field.description}</small>}
    </div>
  );
}
