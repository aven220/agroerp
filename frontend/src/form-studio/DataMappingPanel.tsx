import type { FormFieldDefinition, FormEntityMapping, FormFieldEntityMapping, FieldDataProvider } from '../api/forms';
import { UNIVERSAL_CATALOG_REGISTRY, UCEM_ERP_ENTITIES } from './ucem/universal-catalog-registry';
import type { UniversalCatalogDefinition } from './ucem/universal-catalog-registry';
import {
  applyDataProviderToField,
  DATA_PROVIDER_LABELS,
  DATA_PROVIDER_TYPES,
  inferDataProvider,
  isDataField,
} from './ucem/data-provider-utils';

export interface DataMappingValue {
  entityMapping: FormEntityMapping;
  universalCatalogs: UniversalCatalogDefinition[];
}

interface Props {
  fields: FormFieldDefinition[];
  value: DataMappingValue;
  disabled?: boolean;
  onChange: (next: DataMappingValue) => void;
  onFieldsChange: (fields: FormFieldDefinition[]) => void;
}

const ENTITY_OPTIONS = Object.keys(UCEM_ERP_ENTITIES);

function defaultMapping(): FormEntityMapping {
  return { targetEntity: 'Producer', mappings: [] };
}

export function dataMappingFromForm(
  fields: FormFieldDefinition[],
  metadata?: { entityMapping?: FormEntityMapping },
  schemaCatalogs?: UniversalCatalogDefinition[],
): DataMappingValue {
  return {
    entityMapping: metadata?.entityMapping ?? defaultMapping(),
    universalCatalogs: schemaCatalogs?.length ? schemaCatalogs : [],
  };
}

export function DataMappingPanel({
  fields,
  value,
  disabled,
  onChange,
  onFieldsChange,
}: Props) {
  const dataFields = fields.filter(isDataField);
  const entityProps = UCEM_ERP_ENTITIES[value.entityMapping.targetEntity] ?? [];

  function patchMapping(patch: Partial<FormEntityMapping>) {
    onChange({ ...value, entityMapping: { ...value.entityMapping, ...patch } });
  }

  function getMapping(fieldKey: string): FormFieldEntityMapping | undefined {
    return value.entityMapping.mappings.find((m) => m.fieldKey === fieldKey);
  }

  function setFieldMapping(fieldKey: string, entityProperty: string) {
    const mappings = value.entityMapping.mappings.filter((m) => m.fieldKey !== fieldKey);
    if (entityProperty) {
      mappings.push({
        fieldKey,
        entityType: value.entityMapping.targetEntity,
        entityProperty,
      });
    }
    patchMapping({ mappings });
  }

  function updateFieldProvider(idx: number, provider: FieldDataProvider) {
    const field = fields[idx];
    if (!field) return;
    const updated = applyDataProviderToField(field, provider);
    onFieldsChange(fields.map((f, i) => (i === idx ? updated : f)));

    if (
      (provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG || provider.type === DATA_PROVIDER_TYPES.DEPENDENT) &&
      provider.catalogKey
    ) {
      const catalog = UNIVERSAL_CATALOG_REGISTRY.find((c) => c.catalogKey === provider.catalogKey);
      if (catalog && !value.universalCatalogs.some((c) => c.catalogKey === catalog.catalogKey)) {
        onChange({
          ...value,
          universalCatalogs: [...value.universalCatalogs, catalog],
        });
      }
    }
  }

  function findFieldIndex(key: string) {
    return fields.findIndex((f) => f.key === key);
  }

  return (
    <div className="data-mapping-panel">
      <section className="panel ucem-section">
        <h3>Mapeo ERP (UCEM)</h3>
        <p className="muted">
          Complementa <code>processingType</code> — define cómo cada campo del formulario alimenta la entidad ERP destino.
        </p>
        <div className="form-row">
          <label>
            Entidad destino
            <select
              value={value.entityMapping.targetEntity}
              disabled={disabled}
              onChange={(e) =>
                patchMapping({ targetEntity: e.target.value, mappings: [] })
              }
            >
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel ucem-section">
        <h3>Campos → Propiedades ERP</h3>
        <div className="ucem-mapping-table-wrap">
          <table className="data-table ucem-mapping-table">
            <thead>
              <tr>
                <th>Campo formulario</th>
                <th>→</th>
                <th>{value.entityMapping.targetEntity}</th>
                <th>Data Provider</th>
                <th>Catálogo</th>
              </tr>
            </thead>
            <tbody>
              {dataFields.map((field) => {
                const idx = findFieldIndex(field.key);
                const provider = inferDataProvider(field);
                const mapping = getMapping(field.key);
                return (
                  <tr key={field.key}>
                    <td>
                      <strong>{field.label}</strong>
                      <div className="muted">{field.key} · {field.type}</div>
                    </td>
                    <td>→</td>
                    <td>
                      <select
                        value={mapping?.entityProperty ?? ''}
                        disabled={disabled}
                        onChange={(e) => setFieldMapping(field.key, e.target.value)}
                      >
                        <option value="">— Sin mapeo —</option>
                        {entityProps.map((p) => (
                          <option key={p.property} value={p.property}>
                            {value.entityMapping.targetEntity}.{p.property}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={provider.type}
                        disabled={disabled}
                        onChange={(e) => {
                          const type = e.target.value as FieldDataProvider['type'];
                          updateFieldProvider(idx, { ...provider, type });
                        }}
                      >
                        {Object.entries(DATA_PROVIDER_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {(provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG ||
                        provider.type === DATA_PROVIDER_TYPES.DEPENDENT) ? (
                        <select
                          value={provider.catalogKey ?? ''}
                          disabled={disabled}
                          onChange={(e) =>
                            updateFieldProvider(idx, {
                              ...provider,
                              catalogKey: e.target.value,
                              type: DATA_PROVIDER_TYPES.ERP_CATALOG,
                            })
                          }
                        >
                          <option value="">— Catálogo —</option>
                          {UNIVERSAL_CATALOG_REGISTRY.map((c) => (
                            <option key={c.catalogKey} value={c.catalogKey}>
                              {c.displayName} ({c.domain})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel ucem-section">
        <h3>Catálogos universales del formulario</h3>
        {value.universalCatalogs.length === 0 ? (
          <p className="muted">Asigne catálogos ERP a campos select para registrarlos aquí.</p>
        ) : (
          <div className="ucem-catalog-grid">
            {value.universalCatalogs.map((c) => (
              <div key={c.catalogKey} className="ucem-catalog-card">
                <strong>{c.displayName}</strong>
                <span className="muted">{c.catalogKey}</span>
                <span className="badge">{c.domain}</span>
                <span className="muted">v{c.version} · {c.offlineCapable ? 'offline' : 'online'}</span>
                {c.dependencies?.length ? (
                  <span className="muted">deps: {c.dependencies.join(', ')}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
