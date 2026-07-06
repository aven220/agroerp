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

  if (['photo', 'file', 'pdf', 'gallery', 'signature', 'video', 'audio'].includes(field.type)) {
    return (
      <div className="form-group">
        <label>{field.label}{required ? ' *' : ''}</label>
        <input
          type="file"
          disabled={disabled}
          accept={field.type === 'photo' ? 'image/*' : field.type === 'video' ? 'video/*' : field.type === 'audio' ? 'audio/*' : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(field.key, crypto.randomUUID());
          }}
        />
        {value ? <span className="muted">Archivo registrado</span> : null}
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

  return (
    <div className="form-group">
      <label>{field.label}{required ? ' *' : ''}</label>
      <input
        type="text"
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
      {field.description && <small className="muted">{field.description}</small>}
    </div>
  );
}
