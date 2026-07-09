import type { FieldDataProvider, FormFieldDefinition } from '../../../api/forms';
import {
  dataMappingFromForm,
  getFieldEntityMapping,
  patchEntityMapping,
  setFieldEntityMapping,
  type DataMappingValue,
} from '../../DataMappingPanel';
import { UNIVERSAL_CATALOG_REGISTRY, UCEM_ERP_ENTITIES } from '../../ucem/universal-catalog-registry';
import {
  applyDataProviderToField,
  DATA_PROVIDER_LABELS,
  DATA_PROVIDER_TYPES,
  inferDataProvider,
  isDataField,
} from '../../ucem/data-provider-utils';
import { inspectorRegistry } from '../InspectorRegistry';
import type { InspectorTypeDefinition } from '../types';

const ENTITY_OPTIONS = Object.keys(UCEM_ERP_ENTITIES);

export type ErpMappingInspectorScope = 'form' | 'field';

export interface ErpMappingInspectorContext {
  scope: ErpMappingInspectorScope;
  fields: FormFieldDefinition[];
  value: DataMappingValue;
  disabled?: boolean;
  processingType?: string;
  field?: FormFieldDefinition;
  fieldIndex?: number;
  onChange: (next: DataMappingValue) => void;
  onFieldsChange: (fields: FormFieldDefinition[]) => void;
}

function updateFieldProvider(
  context: ErpMappingInspectorContext,
  fieldIndex: number,
  provider: FieldDataProvider,
) {
  const field = context.fields[fieldIndex];
  if (!field) return;

  const updated = applyDataProviderToField(field, provider);
  context.onFieldsChange(context.fields.map((item, index) => (index === fieldIndex ? updated : item)));

  if (
    (provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG ||
      provider.type === DATA_PROVIDER_TYPES.DEPENDENT) &&
    provider.catalogKey
  ) {
    const catalog = UNIVERSAL_CATALOG_REGISTRY.find((item) => item.catalogKey === provider.catalogKey);
    if (catalog && !context.value.universalCatalogs.some((item) => item.catalogKey === catalog.catalogKey)) {
      context.onChange({
        ...context.value,
        universalCatalogs: [...context.value.universalCatalogs, catalog],
      });
    }
  }
}

function findFieldIndex(fields: FormFieldDefinition[], key: string) {
  return fields.findIndex((field) => field.key === key);
}

const ERP_MAPPING_INSPECTOR: InspectorTypeDefinition<ErpMappingInspectorContext> = {
  type: 'ERP_MAPPING',
  title: (context) => (context.scope === 'field' ? 'Destino del campo' : 'Destino de la información'),
  subtitle: (context) =>
    context.scope === 'field'
      ? `${context.field?.label ?? context.field?.key ?? 'Campo'}`
      : 'Vinculación con expedientes del sistema',
  groups: [
    { id: 'general', title: 'General', priority: 1 },
    { id: 'erp', title: 'ERP', priority: 2 },
    { id: 'data', title: 'Datos', priority: 3 },
    { id: 'advanced', title: 'Catálogos', priority: 4 },
  ],
  properties: [
    {
      id: 'erp.processingType',
      label: 'Acción al enviar',
      groupId: 'general',
      priority: 1,
      visible: (context) => context.scope === 'form',
      presentation: 'raw',
      render: (context) => (
        <p className="muted">
          Qué ocurre cuando el usuario envía el formulario:{' '}
          <code>{context.processingType ?? '—'}</code>
          <br />
          Complementa el mapeo — define cómo cada campo alimenta la entidad ERP destino.
        </p>
      ),
    },
    {
      id: 'erp.targetEntity',
      label: 'Entidad destino',
      groupId: 'erp',
      priority: 1,
      visible: (context) => context.scope === 'form',
      render: (context) => (
        <select
          id="erp.targetEntity"
          disabled={context.disabled}
          value={context.value.entityMapping.targetEntity}
          onChange={(event) =>
            context.onChange(
              patchEntityMapping(context.value, {
                targetEntity: event.target.value,
                mappings: [],
              }),
            )
          }
        >
          {ENTITY_OPTIONS.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
      ),
    },
    {
      id: 'erp.mappingsTable',
      label: 'Campos → Propiedades ERP',
      groupId: 'erp',
      priority: 2,
      visible: (context) => context.scope === 'form',
      presentation: 'raw',
      render: (context) => {
        const dataFields = context.fields.filter(isDataField);
        const entityProps = UCEM_ERP_ENTITIES[context.value.entityMapping.targetEntity] ?? [];

        return (
          <div className="ucem-mapping-table-wrap">
            <table className="data-table ucem-mapping-table">
              <thead>
                <tr>
                  <th>Campo formulario</th>
                  <th>→</th>
                  <th>{context.value.entityMapping.targetEntity}</th>
                  <th>Data Provider</th>
                  <th>Catálogo</th>
                </tr>
              </thead>
              <tbody>
                {dataFields.map((field) => {
                  const fieldIndex = findFieldIndex(context.fields, field.key);
                  const provider = inferDataProvider(field);
                  const mapping = getFieldEntityMapping(context.value, field.key);
                  return (
                    <tr key={field.key}>
                      <td>
                        <strong>{field.label}</strong>
                        <div className="muted">
                          {field.key} · {field.type}
                        </div>
                      </td>
                      <td>→</td>
                      <td>
                        <select
                          value={mapping?.entityProperty ?? ''}
                          disabled={context.disabled}
                          onChange={(event) =>
                            context.onChange(
                              setFieldEntityMapping(
                                context.value,
                                field.key,
                                event.target.value,
                              ),
                            )
                          }
                        >
                          <option value="">— Sin mapeo —</option>
                          {entityProps.map((property) => (
                            <option key={property.property} value={property.property}>
                              {context.value.entityMapping.targetEntity}.{property.property}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={provider.type}
                          disabled={context.disabled}
                          onChange={(event) => {
                            const type = event.target.value as FieldDataProvider['type'];
                            updateFieldProvider(context, fieldIndex, { ...provider, type });
                          }}
                        >
                          {Object.entries(DATA_PROVIDER_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG ||
                        provider.type === DATA_PROVIDER_TYPES.DEPENDENT ? (
                          <select
                            value={provider.catalogKey ?? ''}
                            disabled={context.disabled}
                            onChange={(event) =>
                              updateFieldProvider(context, fieldIndex, {
                                ...provider,
                                catalogKey: event.target.value,
                                type: DATA_PROVIDER_TYPES.ERP_CATALOG,
                              })
                            }
                          >
                            <option value="">— Catálogo —</option>
                            {UNIVERSAL_CATALOG_REGISTRY.map((catalog) => (
                              <option key={catalog.catalogKey} value={catalog.catalogKey}>
                                {catalog.displayName} ({catalog.domain})
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
        );
      },
    },
    {
      id: 'erp.fieldEntityProperty',
      label: 'Propiedad ERP',
      groupId: 'erp',
      priority: 1,
      visible: (context) => context.scope === 'field' && Boolean(context.field),
      render: (context) => {
        const field = context.field!;
        const entityProps = UCEM_ERP_ENTITIES[context.value.entityMapping.targetEntity] ?? [];
        const mapping = getFieldEntityMapping(context.value, field.key);
        return (
          <select
            id="erp.fieldEntityProperty"
            disabled={context.disabled}
            value={mapping?.entityProperty ?? ''}
            onChange={(event) =>
              context.onChange(setFieldEntityMapping(context.value, field.key, event.target.value))
            }
          >
            <option value="">— Sin mapeo —</option>
            {entityProps.map((property) => (
              <option key={property.property} value={property.property}>
                {context.value.entityMapping.targetEntity}.{property.property}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: 'erp.fieldDataProviderType',
      label: 'Data Provider',
      groupId: 'data',
      priority: 1,
      visible: (context) => context.scope === 'field' && context.fieldIndex != null,
      render: (context) => {
        const fieldIndex = context.fieldIndex!;
        const field = context.fields[fieldIndex];
        const provider = inferDataProvider(field);
        return (
          <select
            id="erp.fieldDataProviderType"
            disabled={context.disabled}
            value={provider.type}
            onChange={(event) => {
              const type = event.target.value as FieldDataProvider['type'];
              updateFieldProvider(context, fieldIndex, { ...provider, type });
            }}
          >
            {Object.entries(DATA_PROVIDER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: 'erp.fieldCatalogKey',
      label: 'Catálogo',
      groupId: 'data',
      priority: 2,
      visible: (context) => {
        if (context.scope !== 'field' || context.fieldIndex == null) return false;
        const provider = inferDataProvider(context.fields[context.fieldIndex]);
        return (
          provider.type === DATA_PROVIDER_TYPES.ERP_CATALOG ||
          provider.type === DATA_PROVIDER_TYPES.DEPENDENT
        );
      },
      render: (context) => {
        const fieldIndex = context.fieldIndex!;
        const provider = inferDataProvider(context.fields[fieldIndex]);
        return (
          <select
            id="erp.fieldCatalogKey"
            disabled={context.disabled}
            value={provider.catalogKey ?? ''}
            onChange={(event) =>
              updateFieldProvider(context, fieldIndex, {
                ...provider,
                catalogKey: event.target.value,
                type: DATA_PROVIDER_TYPES.ERP_CATALOG,
              })
            }
          >
            <option value="">— Catálogo —</option>
            {UNIVERSAL_CATALOG_REGISTRY.map((catalog) => (
              <option key={catalog.catalogKey} value={catalog.catalogKey}>
                {catalog.displayName} ({catalog.domain})
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: 'erp.fieldEntityType',
      label: 'Entidad ERP',
      groupId: 'data',
      priority: 3,
      visible: (context) => {
        if (context.scope !== 'field' || context.fieldIndex == null) return false;
        return inferDataProvider(context.fields[context.fieldIndex]).type === DATA_PROVIDER_TYPES.ERP_ENTITY;
      },
      render: (context) => {
        const fieldIndex = context.fieldIndex!;
        const provider = inferDataProvider(context.fields[fieldIndex]);
        return (
          <select
            id="erp.fieldEntityType"
            disabled={context.disabled}
            value={provider.entityType ?? ''}
            onChange={(event) =>
              updateFieldProvider(context, fieldIndex, {
                ...provider,
                entityType: event.target.value,
              })
            }
          >
            <option value="">— Entidad —</option>
            {ENTITY_OPTIONS.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: 'erp.fieldDependsOn',
      label: 'Depende de campo',
      groupId: 'data',
      priority: 4,
      visible: (context) => {
        if (context.scope !== 'field' || context.fieldIndex == null) return false;
        return inferDataProvider(context.fields[context.fieldIndex]).type === DATA_PROVIDER_TYPES.DEPENDENT;
      },
      render: (context) => {
        const fieldIndex = context.fieldIndex!;
        const field = context.fields[fieldIndex];
        const provider = inferDataProvider(field);
        const candidates = context.fields.filter(
          (candidate) => candidate.key !== field.key && isDataField(candidate),
        );
        return (
          <select
            id="erp.fieldDependsOn"
            disabled={context.disabled}
            value={provider.dependsOnField ?? ''}
            onChange={(event) =>
              updateFieldProvider(context, fieldIndex, {
                ...provider,
                dependsOnField: event.target.value || undefined,
                type: DATA_PROVIDER_TYPES.DEPENDENT,
              })
            }
          >
            <option value="">— Campo padre —</option>
            {candidates.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.label} ({candidate.key})
              </option>
            ))}
          </select>
        );
      },
    },
    {
      id: 'erp.universalCatalogs',
      label: 'Catálogos universales',
      groupId: 'advanced',
      priority: 1,
      visible: (context) => context.scope === 'form',
      presentation: 'raw',
      render: (context) =>
        context.value.universalCatalogs.length === 0 ? (
          <p className="muted">Asigne catálogos ERP a campos select para registrarlos aquí.</p>
        ) : (
          <div className="ucem-catalog-grid">
            {context.value.universalCatalogs.map((catalog) => (
              <div key={catalog.catalogKey} className="ucem-catalog-card">
                <strong>{catalog.displayName}</strong>
                <span className="muted">{catalog.catalogKey}</span>
                <span className="badge">{catalog.domain}</span>
                <span className="muted">
                  v{catalog.version} · {catalog.offlineCapable ? 'offline' : 'online'}
                </span>
                {catalog.dependencies?.length ? (
                  <span className="muted">deps: {catalog.dependencies.join(', ')}</span>
                ) : null}
              </div>
            ))}
          </div>
        ),
    },
  ],
};

export function registerErpMappingInspector(): void {
  inspectorRegistry.register(ERP_MAPPING_INSPECTOR);
}
