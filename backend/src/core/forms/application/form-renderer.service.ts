import { Injectable } from '@nestjs/common';
import {
  FormDefinitionSchema,
  FormFieldDefinition,
} from '@agroerp/shared';
import { ConditionalLogicEngine } from './conditional-logic.engine';
import { CalculatedFieldEngine } from './calculated-field.engine';

export interface RenderedField extends FormFieldDefinition {
  visible: boolean;
  effectiveRequired: boolean;
  computedValue?: unknown;
}

export interface FormRenderResult {
  schemaVersion: number;
  settings?: FormDefinitionSchema['settings'];
  fields: RenderedField[];
  resolvedData: Record<string, unknown>;
}

@Injectable()
export class FormRendererService {
  constructor(
    private readonly conditional: ConditionalLogicEngine,
    private readonly calculated: CalculatedFieldEngine,
  ) {}

  render(
    schema: FormDefinitionSchema,
    partialData: Record<string, unknown> = {},
  ): FormRenderResult {
    const resolvedData = this.calculated.resolve(schema.fields, partialData);

    const fields: RenderedField[] = schema.fields.map((field) => {
      const visible = this.conditional.isVisible(
        field.visibleWhen,
        resolvedData,
      );
      const effectiveRequired = visible
        ? this.conditional.isRequired(
            field.required,
            field.requiredWhen,
            resolvedData,
          )
        : false;

      return {
        ...field,
        visible,
        effectiveRequired,
        computedValue:
          field.type === 'calculated' ? resolvedData[field.key] : undefined,
      };
    });

    return {
      schemaVersion: schema.version,
      settings: schema.settings,
      fields,
      resolvedData,
    };
  }
}
