import type { FormDefinitionSchema, FormCaptureMetadata, FormCatalogRequirement } from '../api/forms';

export type CaptureProcessingUiValue =
  | ''
  | 'PRODUCER_CREATE'
  | 'FARM_CREATE'
  | 'PRODUCTION_CREATE'
  | 'LOT_UPDATE';

export interface CaptureConfigurationValue {
  settings: NonNullable<FormDefinitionSchema['settings']>;
  metadata: FormCaptureMetadata;
  requiredCatalogKeys: string[];
  catalogRequirements: FormCatalogRequirement[];
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
      entityMapping: meta.entityMapping,
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
    entityMapping: metadata.entityMapping,
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
