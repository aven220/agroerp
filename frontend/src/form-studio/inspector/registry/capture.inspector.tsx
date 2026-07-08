import type { FormDefinitionSchema, FormCatalogRequirement } from '../../../api/forms';
import { DYNAMIC_CATALOGS } from '../../form-dynamic-catalogs';
import {
  mergeCaptureValue,
  type CaptureConfigurationValue,
  type CaptureProcessingUiValue,
} from '../../CaptureConfigurationPanel';
import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

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

export interface CaptureInspectorContext {
  value: CaptureConfigurationValue;
  disabled?: boolean;
  onChange: (next: CaptureConfigurationValue) => void;
}

function patch(context: CaptureInspectorContext, partial: Partial<CaptureConfigurationValue>) {
  context.onChange(mergeCaptureValue({ ...context.value, ...partial }));
}

function patchSettings(
  context: CaptureInspectorContext,
  settingsPatch: Partial<NonNullable<FormDefinitionSchema['settings']>>,
) {
  const nextSettings = { ...context.value.settings, ...settingsPatch };
  if (settingsPatch.allowOffline !== undefined) {
    nextSettings.offlineCapable = settingsPatch.allowOffline;
  }
  patch(context, { settings: nextSettings });
}

function addCatalogRequirement(context: CaptureInspectorContext) {
  const catalogKey = Object.keys(DYNAMIC_CATALOGS)[0] ?? 'departamentos';
  const entry: FormCatalogRequirement = { catalogKey, source: 'builtin', offline: true };
  const catalogRequirements = [...context.value.catalogRequirements, entry];
  const requiredCatalogKeys = catalogRequirements.map((item) => item.catalogKey);
  patch(context, { catalogRequirements, requiredCatalogKeys });
}

function updateCatalogRequirement(
  context: CaptureInspectorContext,
  index: number,
  patchReq: Partial<FormCatalogRequirement>,
) {
  const catalogRequirements = context.value.catalogRequirements.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patchReq } : item,
  );
  const requiredCatalogKeys = catalogRequirements.map((item) => item.catalogKey);
  patch(context, { catalogRequirements, requiredCatalogKeys });
}

function removeCatalogRequirement(context: CaptureInspectorContext, index: number) {
  const catalogRequirements = context.value.catalogRequirements.filter((_, i) => i !== index);
  const requiredCatalogKeys = catalogRequirements.map((item) => item.catalogKey);
  patch(context, { catalogRequirements, requiredCatalogKeys });
}

const CAPTURE_INSPECTOR: InspectorTypeDefinition<CaptureInspectorContext> = {
  type: 'CAPTURE',
  title: () => 'Capture',
  subtitle: () => 'Configuración móvil y sincronización',
  groups: [
    { id: 'capture', title: 'Offline', priority: 1 },
    { id: 'general', title: 'GPS', priority: 2 },
    { id: 'data', title: 'Multimedia', priority: 3 },
    { id: 'erp', title: 'Integración ERP', priority: 4 },
    { id: 'advanced', title: 'Catálogos', priority: 5 },
  ],
  properties: [
    {
      id: 'capture.allowOffline',
      label: 'Permitir offline (allowOffline)',
      groupId: 'capture',
      priority: 1,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.settings.allowOffline !== false}
            onChange={(event) => patchSettings(context, { allowOffline: event.target.checked })}
          />
          Permitir offline (allowOffline)
        </label>
      ),
    },
    {
      id: 'capture.allowDraft',
      label: 'Permitir borrador (allowDraft)',
      groupId: 'capture',
      priority: 2,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.settings.allowDraft !== false}
            onChange={(event) => patchSettings(context, { allowDraft: event.target.checked })}
          />
          Permitir borrador (allowDraft)
        </label>
      ),
    },
    {
      id: 'capture.requiresSync',
      label: 'Requiere sincronización (requiresSync)',
      groupId: 'capture',
      priority: 3,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.settings.requiresSync === true}
            onChange={(event) => patchSettings(context, { requiresSync: event.target.checked })}
          />
          Requiere sincronización (requiresSync)
        </label>
      ),
    },
    {
      id: 'capture.location.enabled',
      label: 'Habilitar GPS',
      groupId: 'general',
      priority: 1,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.settings.location?.enabled === true}
            onChange={(event) =>
              patchSettings(context, {
                location: { ...context.value.settings.location, enabled: event.target.checked },
              })
            }
          />
          Habilitar GPS (location.enabled)
        </label>
      ),
    },
    {
      id: 'capture.location.required',
      label: 'GPS obligatorio',
      groupId: 'general',
      priority: 2,
      presentation: 'raw',
      visible: (context) => context.value.settings.location?.enabled === true,
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled || !context.value.settings.location?.enabled}
            checked={context.value.settings.location?.required === true}
            onChange={(event) =>
              patchSettings(context, {
                location: { ...context.value.settings.location, required: event.target.checked },
              })
            }
          />
          GPS obligatorio (location.required)
        </label>
      ),
    },
    {
      id: 'capture.location.accuracy',
      label: 'Precisión máxima (m)',
      groupId: 'general',
      priority: 3,
      visible: (context) => context.value.settings.location?.enabled === true,
      render: (context) => (
        <input
          id="capture.location.accuracy"
          type="number"
          min={1}
          max={500}
          disabled={context.disabled || !context.value.settings.location?.enabled}
          value={context.value.settings.location?.accuracy ?? 50}
          onChange={(event) =>
            patchSettings(context, {
              location: {
                ...context.value.settings.location,
                accuracy: Number(event.target.value) || 50,
              },
            })
          }
        />
      ),
    },
    {
      id: 'capture.media.allowPhotos',
      label: 'Permitir fotos',
      groupId: 'data',
      priority: 1,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.settings.media?.allowPhotos !== false}
            onChange={(event) =>
              patchSettings(context, {
                media: { ...context.value.settings.media, allowPhotos: event.target.checked },
              })
            }
          />
          Permitir fotos (media.allowPhotos)
        </label>
      ),
    },
    {
      id: 'capture.media.multiplePhotos',
      label: 'Múltiples fotos',
      groupId: 'data',
      priority: 2,
      presentation: 'raw',
      visible: (context) => context.value.settings.media?.allowPhotos !== false,
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled || context.value.settings.media?.allowPhotos === false}
            checked={context.value.settings.media?.multiplePhotos === true}
            onChange={(event) =>
              patchSettings(context, {
                media: { ...context.value.settings.media, multiplePhotos: event.target.checked },
              })
            }
          />
          Múltiples fotos (media.multiplePhotos)
        </label>
      ),
    },
    {
      id: 'capture.media.allowFiles',
      label: 'Permitir archivos',
      groupId: 'data',
      priority: 3,
      presentation: 'raw',
      render: (context) => (
        <label className="form-check">
          <input
            type="checkbox"
            disabled={context.disabled}
            checked={context.value.settings.media?.allowFiles === true}
            onChange={(event) =>
              patchSettings(context, {
                media: { ...context.value.settings.media, allowFiles: event.target.checked },
              })
            }
          />
          Permitir archivos (media.allowFiles)
        </label>
      ),
    },
    {
      id: 'capture.processingType',
      label: 'Acción post-envío',
      groupId: 'erp',
      priority: 1,
      presentation: 'raw',
      render: (context) => {
        const processingType = (context.value.metadata.processingType ?? '') as CaptureProcessingUiValue;
        return (
          <div className="capture-erp-options">
            {ERP_OPTIONS.map((option) => (
              <label
                key={option.value || 'capture-only'}
                className={`capture-erp-card ${processingType === option.value ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="processingType"
                  disabled={context.disabled}
                  checked={processingType === option.value}
                  onChange={() =>
                    patch(context, {
                      metadata: {
                        ...context.value.metadata,
                        processingType: option.value || undefined,
                      },
                    })
                  }
                />
                <strong>{option.label}</strong>
                <span className="muted">{option.description}</span>
              </label>
            ))}
          </div>
        );
      },
    },
    {
      id: 'capture.catalogRequirements',
      label: 'Catálogos requeridos',
      groupId: 'advanced',
      priority: 1,
      presentation: 'raw',
      render: (context) => (
        <div className="capture-config-panel">
          <div className="capture-config-header">
            <p className="muted">Claves requeridas para API Capture (requiredCatalogKeys)</p>
            <button
              type="button"
              className="btn btn-sm"
              disabled={context.disabled}
              onClick={() => addCatalogRequirement(context)}
            >
              + Catálogo
            </button>
          </div>
          {context.value.catalogRequirements.length === 0 ? (
            <p className="muted">
              Sin catálogos configurados. Se inferirán desde campos con lista dinámica.
            </p>
          ) : (
            <div className="capture-catalog-list">
              {context.value.catalogRequirements.map((item, index) => (
                <div key={`${item.catalogKey}-${index}`} className="capture-catalog-row">
                  <label>
                    Catálogo
                    <select
                      disabled={context.disabled}
                      value={item.catalogKey}
                      onChange={(event) =>
                        updateCatalogRequirement(context, index, { catalogKey: event.target.value })
                      }
                    >
                      {Object.values(DYNAMIC_CATALOGS).map((catalog) => (
                        <option key={catalog.key} value={catalog.key}>
                          {catalog.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fuente
                    <select
                      disabled={context.disabled}
                      value={item.source ?? 'builtin'}
                      onChange={(event) =>
                        updateCatalogRequirement(context, index, { source: event.target.value })
                      }
                    >
                      {CATALOG_SOURCES.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-check">
                    <input
                      type="checkbox"
                      disabled={context.disabled}
                      checked={item.offline !== false}
                      onChange={(event) =>
                        updateCatalogRequirement(context, index, { offline: event.target.checked })
                      }
                    />
                    Offline
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={context.disabled}
                    onClick={() => removeCatalogRequirement(context, index)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ],
};

export function registerCaptureInspector(): void {
  inspectorRegistry.register(CAPTURE_INSPECTOR);
}
