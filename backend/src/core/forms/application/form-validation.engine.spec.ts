import { BadRequestException } from '@nestjs/common';
import { FormValidationEngine } from './form-validation.engine';
import { ConditionalLogicEngine } from './conditional-logic.engine';
import { CalculatedFieldEngine } from './calculated-field.engine';

describe('FormValidationEngine UDFE', () => {
  let engine: FormValidationEngine;

  beforeEach(() => {
    engine = new FormValidationEngine(
      new ConditionalLogicEngine(),
      new CalculatedFieldEngine(),
    );
  });

  const baseSchema = {
    version: 1,
    fields: [
      { key: 'title', type: 'heading' as const, label: 'Título' },
      { key: 'notes', type: 'textarea' as const, label: 'Notas', required: true },
      { key: 'score', type: 'rating' as const, label: 'Calificación' },
    ],
  };

  it('skips layout fields in validation', () => {
    const result = engine.validate(baseSchema, { notes: 'ok', score: 4 });
    expect(result.data.notes).toBe('ok');
    expect(result.fieldResults.find((r) => r.key === 'title')).toBeUndefined();
  });

  it('requires textarea when marked required', () => {
    expect(() => engine.validate(baseSchema, {})).toThrow(BadRequestException);
  });

  it('validates currency as number', () => {
    const schema = {
      version: 1,
      fields: [{ key: 'amount', type: 'currency' as const, label: 'Monto' }],
    };
    const result = engine.validate(schema, { amount: 1500.5 });
    expect(result.data.amount).toBe(1500.5);
  });
});
