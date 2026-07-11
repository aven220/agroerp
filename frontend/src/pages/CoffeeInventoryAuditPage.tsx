import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { getTraceabilityAudit } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeInventoryAuditPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getTraceabilityAudit().then(setData);
  }, []);

  if (!data) return <LoadingState variant="page" message="Cargando auditoría…" />;
  const summary = (data.summary ?? {}) as Record<string, number>;
  const recentLots = (data.recentLots ?? []) as Array<Record<string, unknown>>;
  const recentMovements = (data.recentMovements ?? []) as Array<Record<string, unknown>>;
  const audits = (data.audits ?? []) as Array<Record<string, unknown>>;

  const auditRows = audits.map((a, i) =>
    withRowId({ ...a, id: String(a.id ?? `audit-${i}`) } as Record<string, unknown>, 'id'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Centro de auditoría inventario/trazabilidad"
        subtitle="Eventos, usuarios, bodegas y correcciones"
        actions={
          <PageActions>
            <Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>
          </PageActions>
        }
      />
      <PageSummary>
        <MetricCard label="Lotes" value={summary.lots ?? 0} />
        <MetricCard label="Movimientos" value={summary.movements ?? 0} />
        <MetricCard label="Kardex" value={summary.kardex ?? 0} />
        <MetricCard label="Trazas" value={summary.traces ?? 0} />
      </PageSummary>
      <PageSection title="Lotes recientes">
        <ul>
          {recentLots.map((l) => (
            <li key={String(l.id)}>{String(l.lotKey)} — {String(l.warehouse)} — {String(l.status)}</li>
          ))}
        </ul>
      </PageSection>
      <PageSection title="Movimientos recientes">
        <ul>
          {recentMovements.map((m) => {
            const lot = m.lot as Record<string, unknown> | undefined;
            return (
              <li key={String(m.id)}>
                {String(m.movementType)} {String(m.quantityKg)} kg · {String(lot?.lotKey ?? '')} ·{' '}
                {m.postedAt ? new Date(String(m.postedAt)).toLocaleString() : ''}
              </li>
            );
          })}
        </ul>
      </PageSection>
      <PageSection title="Auditoría">
        <SimpleRecordsTable
          gridId="coffee-inventory-audit"
          selectable={false}
          data={auditRows}
          columns={[
            { key: 'entityType', label: 'Entidad', getValue: (r) => String(r.entityType) },
            { key: 'entityKey', label: 'Clave', getValue: (r) => String(r.entityKey) },
            { key: 'action', label: 'Acción', getValue: (r) => String(r.action) },
            { key: 'userId', label: 'Usuario', getValue: (r) => String(r.userId ?? '—') },
            {
              key: 'createdAt',
              label: 'Fecha',
              getValue: (r) => (r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'),
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
