import type { FormUcemFieldOrigin } from '../api/forms';

interface Props {
  fieldOrigins: FormUcemFieldOrigin[];
  targetEntity?: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  STATIC_LIST: 'Lista estática',
  ERP_CATALOG: 'Catálogo ERP',
  ERP_ENTITY: 'Entidad ERP',
  DEPENDENT: 'Dependiente',
  FORM_RESULT: 'Resultado',
  EXTERNAL_API: 'API externa',
};

export function UcemPreviewBanner({ fieldOrigins, targetEntity }: Props) {
  if (!fieldOrigins.length) return null;

  return (
    <div className="panel ucem-preview-banner">
      <h3>Origen de los datos</h3>
      {targetEntity && (
        <p className="muted">Se guardará en: <strong>{targetEntity}</strong></p>
      )}
      <div className="ucem-preview-grid">
        {fieldOrigins.map((f) => (
          <div key={f.fieldKey} className="ucem-preview-field">
            <strong>{f.label}</strong>
            <span className="badge">{PROVIDER_LABELS[f.dataProviderType] ?? f.dataProviderType}</span>
            {f.catalogKey && <span className="muted">📚 {f.catalogKey}</span>}
            {f.dependencies?.length ? (
              <span className="muted">↳ {f.dependencies.join(', ')}</span>
            ) : null}
            {f.entityProperty && (
              <span className="ucem-erp-map">
                → {f.entityType}.{f.entityProperty}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
