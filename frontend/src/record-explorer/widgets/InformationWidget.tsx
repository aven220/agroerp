import { useMemo, type ReactNode } from 'react';
import { WidgetShell } from '../components/WidgetShell';
import { labelField } from '../../lib/userLabels';

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

function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('es-CO');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
  }
  if (typeof value === 'object') return 'Ver sección relacionada';
  return String(value);
}

export function InformationWidget({ entity }: InformationWidgetProps) {
  const fields = useMemo(
    () =>
      Object.entries(entity).filter(
        ([key, value]) => !HIDDEN_KEYS.has(key) && value !== null && value !== undefined,
      ),
    [entity],
  );

  return (
    <WidgetShell
      title="Información general"
      id="ure-info"
      empty={fields.length === 0}
      emptyMessage="No hay datos adicionales para mostrar en este expediente."
    >
      <dl className="ure-field-list">
        {fields.map(([key, value]) => (
          <div key={key} className="ure-field-row">
            <dt>{labelField(key)}</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </WidgetShell>
  );
}
