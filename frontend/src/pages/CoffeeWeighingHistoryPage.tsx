import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { listWeighingAlerts, listWeighingHistory } from '../api/coffee';

export function CoffeeWeighingHistoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    listWeighingHistory().then((r) => setRows(r as Array<Record<string, unknown>>));
    listWeighingAlerts(true).then((r) => setAlerts(r as Array<Record<string, unknown>>));
  }, []);

  const alertData = alerts.map((a, i) =>
    withRowId({ ...a, id: String(a.id ?? a.code ?? `alert-${i}`) } as Record<string, unknown>, 'id', 'code'),
  );
  const weighingData = rows.map((r, i) =>
    withRowId(
      { ...r, id: String(r.id ?? r.weighingNumber ?? `weigh-${i}`) } as Record<string, unknown>,
      'id',
      'weighingNumber',
    ),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Historial de pesajes"
        subtitle="Trazabilidad, lecturas y alertas"
        actions={
          <PageActions>
            <Link to="/compras/pesaje" className="btn">Pesaje</Link>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />

      <PageSection title="Alertas">
        <SimpleRecordsTable
          gridId="coffee-weighing-alerts"
          selectable={false}
          data={alertData}
          columns={[
            { key: 'code', label: 'Código', getValue: (r) => String(r.code) },
            { key: 'severity', label: 'Severidad', getValue: (r) => String(r.severity) },
            { key: 'message', label: 'Mensaje', getValue: (r) => String(r.message) },
            { key: 'resolved', label: 'Resuelta', getValue: (r) => (r.resolved ? 'Sí' : 'No') },
            {
              key: 'createdAt',
              label: 'Fecha',
              getValue: (r) => (r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'),
            },
          ]}
        />
      </PageSection>

      <PageSection title="Pesajes registrados">
        <SimpleRecordsTable
          gridId="coffee-weighing-history"
          selectable={false}
          data={weighingData}
          columns={[
            { key: 'weighingNumber', label: 'Número', getValue: (r) => String(r.weighingNumber ?? '—') },
            {
              key: 'ticketKey',
              label: 'Ticket',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.ticketKey ?? ''),
            },
            { key: 'weighingType', label: 'Tipo', getValue: (r) => String(r.weighingType) },
            {
              key: 'weightKg',
              label: 'Peso',
              getValue: (r) => (r.weightKg != null ? `${r.weightKg} kg` : '—'),
            },
            { key: 'source', label: 'Fuente', getValue: (r) => String(r.source) },
            {
              key: 'scale',
              label: 'Balanza',
              getValue: (r) =>
                String((r.scale as Record<string, unknown> | undefined)?.scaleKey ?? r.iotDeviceKey ?? '—'),
            },
            { key: 'firmwareVersion', label: 'Firmware', getValue: (r) => String(r.firmwareVersion ?? '—') },
            {
              key: 'contingency',
              label: 'Contingencia',
              getValue: (r) => (r.contingency ? String(r.contingencyReason ?? 'Sí') : 'No'),
            },
            {
              key: 'recordedAt',
              label: 'Fecha',
              getValue: (r) => (r.recordedAt ? new Date(String(r.recordedAt)).toLocaleString() : '—'),
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
