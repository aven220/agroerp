import type { FormFieldDefinition } from '../../api/forms';

type ConditionalRule = {
  field: string;
  operator: string;
  value?: unknown;
};

const OPERATORS = [
  { value: 'eq', label: 'es igual a' },
  { value: 'neq', label: 'es distinto de' },
  { value: 'not_empty', label: 'tiene valor' },
  { value: 'empty', label: 'está vacío' },
  { value: 'gt', label: 'mayor que' },
  { value: 'gte', label: 'mayor o igual que' },
  { value: 'lt', label: 'menor que' },
  { value: 'lte', label: 'menor o igual que' },
];

function asRule(raw: unknown): ConditionalRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as ConditionalRule;
  if (!r.field || !r.operator) return null;
  return r;
}

function needsValue(operator: string) {
  return !['empty', 'not_empty'].includes(operator);
}

interface Props {
  label: string;
  ruleKey: 'visibleWhen' | 'requiredWhen';
  field: FormFieldDefinition;
  allFields: FormFieldDefinition[];
  onChange: (patch: Partial<FormFieldDefinition>) => void;
}

export function ConditionalRuleEditor({ label, ruleKey, field, allFields, onChange }: Props) {
  const rule = asRule(field[ruleKey]);
  const enabled = Boolean(rule);
  const otherFields = allFields.filter((f) => f.key !== field.key && !['heading', 'separator', 'hidden'].includes(f.type));

  function setRule(next: ConditionalRule | undefined) {
    onChange({ [ruleKey]: next });
  }

  function updateRule(patch: Partial<ConditionalRule>) {
    const base = rule ?? { field: otherFields[0]?.key ?? '', operator: 'eq', value: true };
    setRule({ ...base, ...patch });
  }

  return (
    <div className="form-group conditional-rule-editor">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (!e.target.checked) {
              setRule(undefined);
              return;
            }
            updateRule({
              field: otherFields[0]?.key ?? '',
              operator: 'eq',
              value: true,
            });
          }}
        />
        {' '}
        {label}
      </label>
      {enabled && rule && (
        <div className="conditional-rule-fields">
          <select
            value={rule.field}
            onChange={(e) => updateRule({ field: e.target.value })}
          >
            {otherFields.map((f) => (
              <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
            ))}
          </select>
          <select
            value={rule.operator}
            onChange={(e) => updateRule({ operator: e.target.value })}
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          {needsValue(rule.operator) && (
            <input
              placeholder="valor (true, si, 70...)"
              value={rule.value === undefined ? '' : String(rule.value)}
              onChange={(e) => {
                const raw = e.target.value;
                let value: unknown = raw;
                if (raw === 'true') value = true;
                else if (raw === 'false') value = false;
                else if (raw !== '' && !Number.isNaN(Number(raw))) value = Number(raw);
                updateRule({ value });
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
