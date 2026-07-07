import { WidgetShell } from '../components/WidgetShell';

interface InformationWidgetProps {
  entity: Record<string, unknown>;
}

const HIDDEN_KEYS = new Set([
  'id',
  'organizationId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'documents',
  'territoryLinks',
  'producerLinks',
  'lots',
  'operations',
  'farmUnit',
  'responsibleProducer',
  'ftipLot',
]);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function InformationWidget({ entity }: InformationWidgetProps) {
  const fields = Object.entries(entity).filter(
    ([key, value]) => !HIDDEN_KEYS.has(key) && value !== null && value !== undefined,
  );

  return (
    <WidgetShell title="Información" id="ure-info" empty={fields.length === 0}>
      <dl className="ure-field-list">
        {fields.map(([key, value]) => (
          <div key={key} className="ure-field-row">
            <dt>{key}</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </WidgetShell>
  );
}
