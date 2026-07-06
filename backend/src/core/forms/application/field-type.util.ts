import {
  FORM_FIELD_TYPES,
  FormFieldDefinition,
  FormFieldType,
  UDFE_FIELD_TYPE_ALIASES,
  UDFE_LAYOUT_FIELD_TYPES,
} from '@agroerp/shared';

const LAYOUT_TYPES = new Set<string>(UDFE_LAYOUT_FIELD_TYPES);

export function isLayoutFieldType(type: string): boolean {
  return LAYOUT_TYPES.has(type);
}

export function normalizeFieldType(type: string): FormFieldType {
  const alias = UDFE_FIELD_TYPE_ALIASES[type];
  if (alias) return alias;
  if ((FORM_FIELD_TYPES as readonly string[]).includes(type)) {
    return type as FormFieldType;
  }
  return 'text';
}

export function flattenFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  const result: FormFieldDefinition[] = [];
  for (const field of fields) {
    result.push(field);
    if (field.fields?.length) {
      result.push(...flattenFields(field.fields));
    }
  }
  return result;
}

export function isDataField(field: FormFieldDefinition): boolean {
  if (isLayoutFieldType(field.type)) return false;
  if (field.type === 'button') return false;
  return true;
}
