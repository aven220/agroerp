import { DYNAMIC_CATALOGS } from './form-dynamic-catalogs';
import type { FormDefinitionSchema, FormCaptureMetadata, FormCatalogRequirement } from '../api/forms';

export type CaptureProcessingUiValue =
  | ''
  | 'PRODUCER_CREATE'
  | 'FARM_CREATE'
  | 'PRODUCTION_CREATE'
  | 'LOT_UPDATE';

const ERP_OPTIONS: Array<{ value: CaptureProcessingUiValue; label: string; description: string }> = [
  { value: '', label: 'Solo captura', description: 'Guarda envíos sin acción ERP automática' },
  { value: 'PRODUCER_CREATE', label: 'Crear productor', description: 'PRODUCER_CREATE' },
  { value: 'FARM_CREATE', label: 'Crear finca', description: 'FARM_CREATE' },
  { value: 'PRODUCTION_CREATE', label: 'Registrar producción', description: 'PRODUCTION_CREATE' },
  { value: 'LOT_UPDATE', label: 'Actualizar lote', description: 'Reservado para sincronización de lotes' },
];

const CATALOG_SOURCES = [
  { value: 'builtin', label: 'Catálogo integrado' },
  { value: 'api', label: 'API Capture' },
  { value: 'remote', label: 'Servicio remoto' },
] as const;

export interface CaptureConfigurationValue {
  settings: NonNullable<FormDefinitionSchema['settings']>;
  metadata: FormCaptureMetadata;
  requiredCatalogKeys: string[];
  catalogRequirements: FormCatalogRequirement[];
}

interface Props {
  value: CaptureConfigurationValue;
  disabled?: boolean;
  onChange: (next: CaptureConfigurationValue) => void;
}

function defaultCaptureValue(): CaptureConfigurationValue {
  return {
    settings: {
      allowOffline: true,
      allowDraft: true,
      requiresSync: true,
      offlineCapable: true,
      location: { enabled: false, required: false, accuracy: 50 },
      media: { allowPhotos: true, multiplePhotos: false, allowFiles: false },
    },
    metadata: {},
    requiredCatalogKeys: [],
    catalogRequirements: [],
  };
}

export function mergeCaptureValue(
  partial?: Partial<CaptureConfigurationValue>,
): CaptureConfigurationValue {
  const base = defaultCaptureValue();
  return {
    settings: { ...base.settings, ...partial?.settings },
    metadata: { ...base.metadata, ...partial?.metadata },
    requiredCatalogKeys: partial?.requiredCatalogKeys ?? base.requiredCatalogKeys,
    catalogRequirements: partial?.catalogRequirements ?? base.catalogRequirements,
  };
}

export function captureValueFromForm(
  schema?: FormDefinitionSchema,
  metadata?: FormCaptureMetadata | Record<string, unknown>,
): CaptureConfigurationValue {
  const meta = (metadata ?? {}) as FormCaptureMetadata;
  const settings = schema?.settings ?? {};
  const allowOffline = settings.allowOffline ?? settings.offlineCapable ?? true;
  return mergeCaptureValue({
    settings: {
      ...settings,
      allowOffline,
      offlineCapable: settings.offlineCapable ?? allowOffline,
      location: {
        enabled: settings.location?.enabled ?? settings.requireGps === true,
        required: settings.location?.required ?? settings.requireGps === true,
        accuracy: settings.location?.accuracy ?? 50,
      },
      media: {
        allowPhotos: settings.media?.allowPhotos ?? true,
        multiplePhotos: settings.media?.multiplePhotos ?? false,
        allowFiles: settings.media?.allowFiles ?? false,
      },
    },
    metadata: {
      processingType: meta.processingType,
      requiredCatalogKeys: meta.requiredCatalogKeys,
      catalogRequirements: meta.catalogRequirements,
    },
    requiredCatalogKeys: meta.requiredCatalogKeys ?? [],
    catalogRequirements: meta.catalogRequirements ?? [],
  });
}

export function captureValueToPayload(value: CaptureConfigurationValue) {
  const { settings, metadata, requiredCatalogKeys, catalogRequirements } = value;
  const location = settings.location;
  const requireGps = location?.enabled && location?.required;

  const schemaSettings: NonNullable<FormDefinitionSchema['settings']> = {
    ...settings,
    requireGps,
    location,
    media: settings.media,
  };

  const formMetadata: FormCaptureMetadata = {
    ...metadata,
    requiredCatalogKeys,
    catalogRequirements: catalogRequirements.length ? catalogRequirements : undefined,
  };
  if (!formMetadata.processingType) {
    delete formMetadata.processingType;
  }

  return {
    schemaSettings,
    metadata: formMetadata as Record<string, unknown>,
    requiredCatalogKeys,
  };
}

export function CaptureConfigurationPanel({ value, disabled, onChange }: Props) {
  const processingType = (value.metadata.processingType ?? '') as CaptureProcessingUiValue;

  function patch(partial: Partial<CaptureConfigurationValue>) {
    onChange(mergeCaptureValue({ ...value, ...partial }));
  }

  function patchSettings(settingsPatch: Partial<NonNullable<FormDefinitionSchema['settings']>>) {
    const nextSettings = { ...value.settings, ...settingsPatch };
    if (settingsPatch.allowOffline !== undefined) {
      nextSettings.offlineCapable = settingsPatch.allowOffline;
    }
    patch({ settings: nextSettings });
  }

  function addCatalogRequirement() {
    const catalogKey = Object.keys(DYNAMIC_CATALOGS)[0] ?? 'departamentos';
    const entry: FormCatalogRequirement = { catalogKey, source: 'builtin', offline: true };
    const catalogRequirements = [...value.catalogRequirements, entry];
    const requiredCatalogKeys = catalogRequirements.map((c) => c.catalogKey);
    patch({ catalogRequirements, requiredCatalogKeys });
  }

  function updateCatalogRequirement(index: number, patchReq: Partial<FormCatalogRequirement>) {
    const catalogRequirements = value.catalogRequirements.map((item, i) =>
      i === index ? { ...item, ...patchReq } : item,
    );
    const requiredCatalogKeys = catalogRequirements.map((c) => c.catalogKey);
    patch({ catalogRequirements, requiredCatalogKeys });
  }

  function removeCatalogRequirement(index: number) {
    const catalogRequirements = value.catalogRequirements.filter((_, i) => i !== index);
    const requiredCatalogKeys = catalogRequirements.map((c) => c.catalogKey);
    patch({ catalogRequirements, requiredCatalogKeys });
  }

  return (
    <div className="capture-config-panel">
      <section className="panel capture-config-section">
        <h3>Offline</h3>
        <p className="muted">Comportamiento de captura sin conexión (schema.settings).</p>
        <div className="capture-config-grid">
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.settings.allowOffline !== false}
              onChange={(e) => patchSettings({ allowOffline: e.target.checked })}
            />
            Permitir offline (allowOffline)
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.settings.allowDraft !== false}
              onChange={(e) => patchSettings({ allowDraft: e.target.checked })}
            />
            Permitir borrador (allowDraft)
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.settings.requiresSync === true}
              onChange={(e) => patchSettings({ requiresSync: e.target.checked })}
            />
            Requiere sincronización (requiresSync)
          </label>
        </div>
      </section>

      <section className="panel capture-config-section">
        <h3>GPS</h3>
        <p className="muted">Ubicación en schema.settings.location</p>
        <div className="capture-config-grid">
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.settings.location?.enabled === true}
              onChange={(e) =>
                patchSettings({
                  location: { ...value.settings.location, enabled: e.target.checked },
                })
              }
            />
            Habilitar GPS
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled || !value.settings.location?.enabled}
              checked={value.settings.location?.required === true}
              onChange={(e) =>
                patchSettings({
                  location: { ...value.settings.location, required: e.target.checked },
                })
              }
            />
            GPS obligatorio
          </label>
          <label>
            Precisión máxima (m)
            <input
              type="number"
              min={1}
              max={500}
              disabled={disabled || !value.settings.location?.enabled}
              value={value.settings.location?.accuracy ?? 50}
              onChange={(e) =>
                patchSettings({
                  location: {
                    ...value.settings.location,
                    accuracy: Number(e.target.value) || 50,
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="panel capture-config-section">
        <h3>Multimedia</h3>
        <p className="muted">Adjuntos en schema.settings.media</p>
        <div className="capture-config-grid">
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.settings.media?.allowPhotos !== false}
              onChange={(e) =>
                patchSettings({
                  media: { ...value.settings.media, allowPhotos: e.target.checked },
                })
              }
            />
            Permitir fotos
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled || value.settings.media?.allowPhotos === false}
              checked={value.settings.media?.multiplePhotos === true}
              onChange={(e) =>
                patchSettings({
                  media: { ...value.settings.media, multiplePhotos: e.target.checked },
                })
              }
            />
            Múltiples fotos
          </label>
          <label className="form-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.settings.media?.allowFiles === true}
              onChange={(e) =>
                patchSettings({
                  media: { ...value.settings.media, allowFiles: e.target.checked },
                })
              }
            />
            Permitir archivos
          </label>
        </div>
      </section>

      <section className="panel capture-config-section">
        <h3>Integración ERP</h3>
        <p className="muted">Acción post-envío en metadata.processingType</p>
        <div className="capture-erp-options">
          {ERP_OPTIONS.map((opt) => (
            <label
              key={opt.value || 'capture-only'}
              className={`capture-erp-card ${processingType === opt.value ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="processingType"
                disabled={disabled}
                checked={processingType === opt.value}
                onChange={() =>
                  patch({
                    metadata: {
                      ...value.metadata,
                      processingType: opt.value || undefined,
                    },
                  })
                }
              />
              <strong>{opt.label}</strong>
              <span className="muted">{opt.description}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel capture-config-section">
        <div className="capture-config-header">
          <div>
            <h3>Catálogos</h3>
            <p className="muted">Claves requeridas para API Capture (requiredCatalogKeys)</p>
          </div>
          <button type="button" className="btn btn-sm" disabled={disabled} onClick={addCatalogRequirement}>
            + Catálogo
          </button>
        </div>
        {value.catalogRequirements.length === 0 ? (
          <p className="muted">Sin catálogos configurados. Se inferirán desde campos con lista dinámica.</p>
        ) : (
          <div className="capture-catalog-list">
            {value.catalogRequirements.map((item, index) => (
              <div key={`${item.catalogKey}-${index}`} className="capture-catalog-row">
                <label>
                  Catálogo
                  <select
                    disabled={disabled}
                    value={item.catalogKey}
                    onChange={(e) => updateCatalogRequirement(index, { catalogKey: e.target.value })}
                  >
                    {Object.values(DYNAMIC_CATALOGS).map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Fuente
                  <select
                    disabled={disabled}
                    value={item.source ?? 'builtin'}
                    onChange={(e) => updateCatalogRequirement(index, { source: e.target.value })}
                  >
                    {CATALOG_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-check">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={item.offline !== false}
                    onChange={(e) => updateCatalogRequirement(index, { offline: e.target.checked })}
                  />
                  Offline
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  disabled={disabled}
                  onClick={() => removeCatalogRequirement(index)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
