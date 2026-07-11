import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import {
  getEimsExecutiveDashboard,
  getEimsOpsCenter,
  getEimsOperationalDashboard,
  refreshEimsOpsAlerts,
} from '../api/eims';

type OccupancyRow = Record<string, unknown> & { id: string };

const occupancyColumns: SimpleColumn<OccupancyRow>[] = [
  { key: 'name', label: 'Bodega', getValue: (r) => String(r.name ?? '') },
  { key: 'usedCapacity', label: 'Usado', getValue: (r) => String(r.usedCapacity ?? '') },
  { key: 'totalCapacity', label: 'Total', getValue: (r) => String(r.totalCapacity ?? '') },
  { key: 'occupancyPct', label: 'Ocupación', getValue: (r) => `${String(r.occupancyPct ?? '')}%` },
  { key: 'availableCapacity', label: 'Disponible', getValue: (r) => String(r.availableCapacity ?? '') },
];

export function EimsOpsCenterPage() {
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  const [executive, setExecutive] = useState<Record<string, unknown> | null>(null);
  const [operational, setOperational] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const reload = async () => {
    const [o, e, op] = await Promise.all([
      getEimsOpsCenter(),
      getEimsExecutiveDashboard(),
      getEimsOperationalDashboard(),
    ]);
    setOps(o);
    setExecutive(e);
    setOperational(op);
  };

  useEffect(() => { reload().catch((err) => setError(err.message)); }, []);

  if (!ops && !error) return <LoadingState variant="dashboard" message="Cargando centro de operaciones..." />;

  const critical = (ops?.criticalItems as Array<Record<string, unknown>>) ?? [];
  const byHour = (ops?.movementsByHour as Array<Record<string, unknown>>) ?? [];
  const occupancy = ((ops?.warehouseOccupancy as Array<Record<string, unknown>>) ?? []).map((row) =>
    withRowId(row, 'warehouseKey', 'id'),
  );
  const alerts = ((operational?.alerts as Array<Record<string, unknown>>) ?? []).slice(0, 10);

  return (
    <PageLayout>
      <PageHeader
        title="Centro de operaciones — Inventario"
        subtitle="Monitoreo en tiempo real, KPIs y analítica operativa"
        actions={
          <PageActions>
            <button className="btn" onClick={() => refreshEimsOpsAlerts().then(reload).catch((e) => setError(e.message))}>
              Refrescar alertas
            </button>
            <Link to="/inventario/ops/reportes" className="btn">Reportes</Link>
            <Link to="/inventario/ops/analitica" className="btn">Analítica</Link>
            <Link to="/inventario/ops/mapa" className="btn">Mapa ocupación</Link>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSummary className="kpi-grid-lg">
        <MetricCard label="Existencias" value={String(ops?.totalQty ?? 0)} tone="green" />
        <MetricCard label="Valor inventario" value={String(ops?.inventoryValue ?? 0)} />
        <MetricCard label="Disponible" value={String(ops?.availableQty ?? 0)} />
        <MetricCard label="Reservado" value={String(ops?.reservedQty ?? 0)} />
        <MetricCard label="Bloqueado" value={String(ops?.blockedQty ?? 0)} />
        <MetricCard label="Rotación" value={String(ops?.turnover ?? 0)} />
        <MetricCard label="Cobertura días" value={String(ops?.coverageDays ?? 0)} />
        <MetricCard label="Movimientos hoy" value={String(ops?.movementsToday ?? 0)} tone="blue" />
        <MetricCard label="Capacidad usada" value={String(ops?.capacityUsed ?? 0)} />
        <MetricCard label="Capacidad libre" value={String(ops?.capacityAvailable ?? 0)} />
        <MetricCard label="Nivel servicio" value={`${String(executive?.serviceLevel ?? 0)}%`} />
        <MetricCard label="Exactitud" value={`${String(executive?.inventoryAccuracy ?? 0)}%`} />
      </PageSummary>

      <PageSection title="Dashboard ejecutivo">
        <p>
          Valor: {String(executive?.inventoryValue ?? 0)} · Críticos: {String(executive?.criticalItems ?? 0)} ·
          Alertas: {String(executive?.openAlerts ?? 0)} · Sugerencias: {String(executive?.openSuggestions ?? 0)}
        </p>
      </PageSection>

      <PageSection title="Movimientos por hora">
        <div className="row-actions">
          {byHour.map((h) => (
            <span key={String(h.hour)} className="kpi-card">
              {String(h.hour)}h: {String(h.count)}
            </span>
          ))}
        </div>
      </PageSection>

      <PageSection title="Ocupación de bodegas">
        <SimpleRecordsTable
          gridId="eims-ops-occupancy"
          columns={occupancyColumns}
          data={occupancy}
          selectable={false}
          emptyMessage="Sin datos de ocupación"
        />
      </PageSection>

      <PageSection title="Artículos críticos">
        <ul>
          {critical.map((c) => (
            <li key={`${String(c.itemKey)}-${String(c.warehouseKey)}`}>
              {String(c.itemKey)} @ {String(c.warehouseKey)} · disponible={String(c.availableQty)}
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Alertas operativas">
        <ul>
          {alerts.map((a) => (
            <li key={String(a.id)}>[{String(a.severity)}] {String(a.title)} — {String(a.message)}</li>
          ))}
        </ul>
      </PageSection>
    </PageLayout>
  );
}
