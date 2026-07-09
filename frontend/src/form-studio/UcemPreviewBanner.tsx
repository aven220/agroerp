import type { FormUcemFieldOrigin } from '../api/forms';
import { labelEntity, PROVIDER_LABELS } from './studio-labels';

interface Props {
  fieldOrigins: FormUcemFieldOrigin[];
  targetEntity?: string;
}

export function UcemPreviewBanner({ fieldOrigins, targetEntity }: Props) {
  if (!fieldOrigins.length) return null;

  return (
    <div className="panel fs-data-origin-banner">
      <h3>Origen de los datos</h3>
      {targetEntity && (
        <p className="muted">Se guardará en: <strong>{labelEntity(targetEntity)}</strong></p>
      )}
      <div className="ucem-preview-grid">
        {fieldOrigins.map((f) => (
          <div key={f.fieldKey} className="ucem-preview-field">
            <strong>{f.label}</strong>
            <span className="badge">{PROVIDER_LABELS[f.dataProviderType] ?? 'Personalizado'}</span>
            {f.catalogKey ? <span className="muted">Catálogo: {f.catalogKey}</span> : null}
            {f.dependencies?.length ? (
              <span className="muted">Depende de: {f.dependencies.join(', ')}</span>
            ) : null}
            {f.entityProperty ? (
              <span className="ucem-erp-map">
                → {labelEntity(f.entityType)} · {f.entityProperty}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
