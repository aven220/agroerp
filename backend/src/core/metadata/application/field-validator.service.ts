import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FieldDefinition,
  FieldType,
  ResourceSchemaDefinition,
} from '@agroerp/shared';

@Injectable()
export class FieldValidatorService {
  validate(
    schema: ResourceSchemaDefinition,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const validated: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const field of schema.fields) {
      const value = data[field.key];
      const hasValue = value !== undefined && value !== null && value !== '';

      if (field.required && !hasValue) {
        errors.push(`Field "${field.key}" is required`);
        continue;
      }

      if (!hasValue) continue;

      try {
        validated[field.key] = this.validateField(field, value);
      } catch (err) {
        errors.push((err as Error).message);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }

    return validated;
  }

  private validateField(field: FieldDefinition, value: unknown): unknown {
    switch (field.type as FieldType) {
      case 'string':
        return this.validateString(field, value);
      case 'number':
        return this.validateNumber(field, value);
      case 'boolean':
        return this.validateBoolean(value);
      case 'date':
        return this.validateDate(value);
      case 'geo':
        return this.validateGeo(value);
      case 'file':
        return this.validateFileRef(value);
      case 'relation':
        return this.validateRelation(field, value);
      default:
        throw new BadRequestException(`Unsupported field type: ${field.type}`);
    }
  }

  private validateString(field: FieldDefinition, value: unknown): string {
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
    if (v?.enum && !v.enum.includes(value)) {
      throw new Error(`Field "${field.key}" must be one of: ${v.enum.join(', ')}`);
    }
    return value;
  }

  private validateNumber(field: FieldDefinition, value: unknown): number {
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

  private validateDate(value: unknown): string {
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Value must be a valid date');
    }
    return date.toISOString();
  }

  private validateGeo(value: unknown): { lat: number; lng: number } {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('lat' in value) ||
      !('lng' in value)
    ) {
      throw new Error('Geo field must be { lat, lng }');
    }
    const geo = value as { lat: unknown; lng: unknown };
    const lat = Number(geo.lat);
    const lng = Number(geo.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new Error('Geo lat/lng must be numbers');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Geo coordinates out of range');
    }
    return { lat, lng };
  }

  private validateFileRef(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error('File field must be a resource/file id string');
    }
    return value;
  }

  private validateRelation(field: FieldDefinition, value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error(`Relation field "${field.key}" must be a resource id`);
    }
    return value;
  }
}
