import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import { getEimsWarehouseMap, listEimsOpsAlerts, refreshEimsOpsAlerts, acknowledgeEimsOpsAlert } from '../api/eims';

type MapRow = Record<string, unknown> & { id: string };
type AlertRow = Record<string, unknown> & { id: string };

const mapColumns: SimpleColumn<MapRow>[] = [
  { key: 'name', label: 'Bodega', getValue: (r) => String(r.name ?? '') },
  { key: 'latitude', label: 'Lat', getValue: (r) => String(r.latitude ?? '—') },
  { key: 'longitude', label: 'Lng', getValue: (r) => String(r.longitude ?? '—') },
  { key: 'usedCapacity', label: 'Usado', getValue: (r) => String(r.usedCapacity ?? '') },
  { key: 'totalCapacity', label: 'Capacidad', getValue: (r) => String(r.totalCapacity ?? '') },
  {
    key: 'occupancyPct',
    label: 'Ocupación',
    render: (r) => (
      <div className="bar-meter">
        <div
          className={`bar-fill${r.saturated ? ' bar-fill-danger' : ''}`}
          style={{ width: `${Math.min(100, Number(r.occupancyPct) || 0)}%` }}
        />
        <span>{String(r.occupancyPct)}%</span>
      </div>
    ),
    getValue: (r) => String(r.occupancyPct ?? ''),
  },
  { key: 'availableCapacity', label: 'Disponible', getValue: (r) => String(r.availableCapacity ?? '') },
  {
    key: 'status',
    label: 'Estado',
    getValue: (r) => (r.saturated ? 'Saturada' : 'OK'),
  },
];

const alertColumns: SimpleColumn<AlertRow>[] = [
  { key: 'alertType', label: 'Tipo', getValue: (r) => String(r.alertType ?? '') },
  { key: 'severity', label: 'Severidad', getValue: (r) => String(r.severity ?? '') },
  { key: 'message', label: 'Mensaje', getValue: (r) => String(r.message ?? '') },
];

export function EimsWarehouseMapPage() {
  const [rows, setRows] = useState<MapRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [error, setError] = useState('');

  const reload = async () => {
    const [m, a] = await Promise.all([getEimsWarehouseMap(), listEimsOpsAlerts(false)]);
    setRows((m as Array<Record<string, unknown>>).map((row) => withRowId(row, 'warehouseKey', 'id')));
    setAlerts((a as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'alertKey')));
  };

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  const alertActions: RowAction<AlertRow>[] = [
    {
      id: 'ack',
      label: 'Acusar',
      onAction: (r) => {
        acknowledgeEimsOpsAlert(String(r.alertKey))
          .then(reload)
          .catch((e) => setError(e.message));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Mapa de ocupación de bodegas"
        subtitle="Capacidad utilizada, saturación y alertas operativas"
        actions={
          <PageActions>
            <button
              className="btn"
              onClick={() => refreshEimsOpsAlerts().then(reload).catch((e) => setError(e.message))}
            >
              Refrescar alertas
            </button>
            <Link to="/inventario/ops" className="btn">Centro de operaciones</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Ocupación">
        <SimpleRecordsTable
          gridId="eims-warehouse-map"
          columns={mapColumns}
          data={rows}
          selectable={false}
          emptyMessage="Sin bodegas"
        />
      </PageSection>

      <PageSection title="Panel de alertas operativas">
        <SimpleRecordsTable
          gridId="eims-ops-alerts-map"
          columns={alertColumns}
          data={alerts}
          selectable={false}
          rowActions={alertActions}
          emptyMessage="Sin alertas"
        />
      </PageSection>
    </PageLayout>
  );
}
