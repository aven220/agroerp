import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FormDefinitionSchema,
  FormFieldDefinition,
  FormFieldType,
  FormGeofence,
} from '@agroerp/shared';
import { ConditionalLogicEngine } from './conditional-logic.engine';
import { CalculatedFieldEngine } from './calculated-field.engine';
import { flattenFields, isDataField, isLayoutFieldType, normalizeFieldType } from './field-type.util';

export interface ValidationResult {
  data: Record<string, unknown>;
  fieldResults: { key: string; valid: boolean; error?: string }[];
}

@Injectable()
export class FormValidationEngine {
  constructor(
    private readonly conditional: ConditionalLogicEngine,
    private readonly calculated: CalculatedFieldEngine,
  ) {}

  validate(
    schema: FormDefinitionSchema,
    rawData: Record<string, unknown>,
    options?: {
      gpsLocation?: { lat: number; lng: number; accuracy?: number } | null;
      emitFieldResults?: boolean;
    },
  ): ValidationResult {
    const withCalculated = this.calculated.resolve(schema.fields, rawData);
    const validated: Record<string, unknown> = {};
    const fieldResults: { key: string; valid: boolean; error?: string }[] = [];
    const errors: string[] = [];

    if (schema.settings?.requireGps && !options?.gpsLocation) {
      errors.push('GPS location is required for this form');
    }

    if (schema.settings?.geofence && options?.gpsLocation) {
      const inside = this.isInsideGeofence(
        options.gpsLocation,
        schema.settings.geofence,
      );
      if (!inside) {
        errors.push('GPS location is outside the allowed geofence');
      }
    }

    const allFields = flattenFields(schema.fields);

    for (const field of allFields) {
      if (!isDataField(field)) continue;
      if (field.type === 'calculated' || field.type === 'derived') continue;
      if (isLayoutFieldType(field.type)) continue;

      const visible = this.conditional.isVisible(field.visibleWhen, withCalculated);
      if (!visible) continue;

      const required = this.conditional.isRequired(
        field.required,
        field.requiredWhen,
        withCalculated,
      );

      const value = withCalculated[field.key];
      const hasValue = value !== undefined && value !== null && value !== '';

      if (required && !hasValue) {
        const msg = `Field "${field.key}" is required`;
        errors.push(msg);
        fieldResults.push({ key: field.key, valid: false, error: msg });
        continue;
      }

      if (!hasValue) {
        fieldResults.push({ key: field.key, valid: true });
        continue;
      }

      try {
        validated[field.key] = this.validateField(field, value);
        fieldResults.push({ key: field.key, valid: true });
      } catch (err) {
        const msg = (err as Error).message;
        errors.push(msg);
        fieldResults.push({ key: field.key, valid: false, error: msg });
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Form validation failed',
        errors,
        fieldResults: options?.emitFieldResults ? fieldResults : undefined,
      });
    }

    return { data: validated, fieldResults };
  }

  private validateField(field: FormFieldDefinition, value: unknown): unknown {
    const type = normalizeFieldType(field.type);
    switch (type) {
      case 'text':
      case 'barcode':
        return this.validateText(field, value);
      case 'number':
        return this.validateNumber(field, value);
      case 'boolean':
        return this.validateBoolean(value);
      case 'checkbox':
        if (field.options?.length) {
          return this.validateMultiSelect(field, value);
        }
        return this.validateBoolean(value);
      case 'radio':
        return this.validateSelect(field, value);
      case 'date':
      case 'datetime':
        return this.validateDate(value, type === 'datetime');
      case 'select':
        return this.validateSelect(field, value);
      case 'multi_select':
        return this.validateMultiSelect(field, value);
      case 'geo':
        return this.validateGeo(field, value);
      case 'geo_track':
        return this.validateGeoTrack(value);
      case 'photo':
      case 'video':
      case 'audio':
      case 'signature':
      case 'file':
        return this.validateMediaRef(field, value);
      case 'relation':
        return this.validateRelation(field, value);
      case 'repeat_group':
        if (!Array.isArray(value)) {
          throw new Error(`Field "${field.key}" must be an array`);
        }
        return value;
      case 'matrix':
      case 'scale':
      case 'likert':
      case 'rating':
      case 'emoji':
        return value;
      default:
        return this.validateText(field, value);
    }
  }

  private validateText(field: FormFieldDefinition, value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error(`Field "${field.key}" must be a string`);
    }
    const v = field.validation;
    if (v?.minLength && value.length < v.minLength) {
      throw new Error(`Field "${field.key}" min length is ${v.minLength}`);
    }
    if (v?.maxLength && value.length > v.maxLength) {
      throw new Error(`Field "${field.key}" max length is ${v.maxLength}`);
    }
    if (v?.pattern && !new RegExp(v.pattern).test(value)) {
      throw new Error(`Field "${field.key}" does not match pattern`);
    }
    return value;
  }

  private validateNumber(field: FormFieldDefinition, value: unknown): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) {
      throw new Error(`Field "${field.key}" must be a number`);
    }
    const v = field.validation;
    if (v?.min !== undefined && num < v.min) {
      throw new Error(`Field "${field.key}" min is ${v.min}`);
    }
    if (v?.max !== undefined && num > v.max) {
      throw new Error(`Field "${field.key}" max is ${v.max}`);
    }
    return num;
  }

  private validateBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error('Value must be a boolean');
  }

  private validateDate(value: unknown, includeTime: boolean): string {
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Value must be a valid date');
    }
    return includeTime ? date.toISOString() : date.toISOString().slice(0, 10);
  }

  private validateSelect(field: FormFieldDefinition, value: unknown): string {
    const str = String(value);
    const allowed = field.options?.map((o) => o.value) ?? field.validation?.enum;
    if (allowed && !allowed.includes(str)) {
      throw new Error(`Field "${field.key}" must be one of: ${allowed.join(', ')}`);
    }
    return str;
  }

  private validateMultiSelect(
    field: FormFieldDefinition,
    value: unknown,
  ): string[] {
    if (!Array.isArray(value)) {
      throw new Error(`Field "${field.key}" must be an array`);
    }
    const allowed = field.options?.map((o) => o.value) ?? field.validation?.enum;
    for (const item of value) {
      const str = String(item);
      if (allowed && !allowed.includes(str)) {
        throw new Error(`Field "${field.key}" contains invalid option: ${str}`);
      }
    }
    return value.map(String);
  }

  private validateGeo(
    field: FormFieldDefinition,
    value: unknown,
  ): { lat: number; lng: number; accuracy?: number } {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('lat' in value) ||
      !('lng' in value)
    ) {
      throw new Error(`Field "${field.key}" must be { lat, lng }`);
    }
    const geo = value as { lat: unknown; lng: unknown; accuracy?: unknown };
    const lat = Number(geo.lat);
    const lng = Number(geo.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new Error(`Field "${field.key}" lat/lng must be numbers`);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(`Field "${field.key}" coordinates out of range`);
    }
    const result: { lat: number; lng: number; accuracy?: number } = { lat, lng };
    if (geo.accuracy !== undefined) {
      result.accuracy = Number(geo.accuracy);
      // maxAccuracyMeters is advisory for field capture: outdoor GPS often
      // reports 30–100m and rejecting it left Android sync permanently pending.
      const maxAcc = field.validation?.maxAccuracyMeters;
      if (
        maxAcc &&
        Number.isFinite(result.accuracy) &&
        result.accuracy > maxAcc
      ) {
        // keep coordinates; do not fail the submission
      }
    }
    if (field.validation?.requireGps && !result.accuracy) {
      throw new Error(`Field "${field.key}" requires GPS accuracy`);
    }
    return result;
  }

  private validateGeoTrack(value: unknown): { lat: number; lng: number }[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error('Geo track must be a non-empty array of points');
    }
    return value.map((point, i) => {
      try {
        return this.validateGeo(
          { key: `track[${i}]`, type: 'geo', label: '' },
          point,
        );
      } catch {
        throw new Error(`Geo track point ${i} is invalid`);
      }
    });
  }

  private validateMediaRef(
    field: FormFieldDefinition,
    value: unknown,
  ): string | string[] {
    if (field.type === 'photo' || field.type === 'file') {
      if (Array.isArray(value)) {
        return value.map((v) => this.assertUuid(String(v), field.key));
      }
      return this.assertUuid(String(value), field.key);
    }
    return this.assertUuid(String(value), field.key);
  }

  private validateRelation(field: FormFieldDefinition, value: unknown): string {
    return this.assertUuid(String(value), field.key);
  }

  private assertUuid(value: string, key: string): string {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(`Field "${key}" must be a valid resource/file id`);
    }
    return value;
  }

  private isInsideGeofence(
    point: { lat: number; lng: number },
    geofence: FormGeofence,
  ): boolean {
    const distance = this.haversineMeters(
      point.lat,
      point.lng,
      geofence.center.lat,
      geofence.center.lng,
    );
    return distance <= geofence.radiusMeters;
  }

  private haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
