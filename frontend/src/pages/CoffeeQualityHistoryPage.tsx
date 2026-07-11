import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { listCoffeeQuality, listQualityAlerts } from '../api/coffee';

export function CoffeeQualityHistoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [producerId, setProducerId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [lotCode, setLotCode] = useState('');

  const reload = () => {
    listCoffeeQuality({
      producerId: producerId || undefined,
      farmId: farmId || undefined,
      lotCode: lotCode || undefined,
    }).then((r) => setRows(r as Array<Record<string, unknown>>));
    listQualityAlerts(true).then((r) => setAlerts(r as Array<Record<string, unknown>>));
  };

  useEffect(() => { reload(); }, []);

  const data = rows.map((r, i) =>
    withRowId({ ...r, id: String(r.id ?? `qh-${i}`) } as Record<string, unknown>, 'id'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Historial de calidad"
        subtitle="Por productor, finca y lote"
        actions={
          <PageActions>
            <Link to="/compras/calidad" className="btn">Panel calidad</Link>
          </PageActions>
        }
      />

      <PageSection title="Filtros">
        <PageToolbar>
          <FieldGroup label="Productor">
            <input placeholder="producerId" value={producerId} onChange={(e) => setProducerId(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Finca">
            <input placeholder="farmId" value={farmId} onChange={(e) => setFarmId(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Lote">
            <input placeholder="lotCode" value={lotCode} onChange={(e) => setLotCode(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn" onClick={reload}>Filtrar</button>
        </FormActions>
      </PageSection>

      <PageSection title="Alertas">
        <ul>
          {alerts.map((a, i) => (
            <li key={i}>[{String(a.severity)}] {String(a.code)} — {String(a.message)}</li>
          ))}
        </ul>
      </PageSection>

      <PageSection title="Evaluaciones">
        <SimpleRecordsTable
          gridId="coffee-quality-history"
          selectable={false}
          data={data}
          columns={[
            {
              key: 'ticketKey',
              label: 'Ticket',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.ticketKey ?? ''),
            },
            {
              key: 'producerName',
              label: 'Productor',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.producerName ?? ''),
            },
            {
              key: 'farmName',
              label: 'Finca',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.farmName ?? ''),
            },
            {
              key: 'lotCode',
              label: 'Lote',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.lotCode ?? ''),
            },
            {
              key: 'humidityPct',
              label: 'Humedad',
              getValue: (r) => (r.humidityPct != null ? `${r.humidityPct}%` : '—'),
            },
            { key: 'factor', label: 'Factor', getValue: (r) => String(r.factor ?? '—') },
            { key: 'qualityScore', label: 'Score', getValue: (r) => String(r.qualityScore ?? '—') },
            { key: 'grade', label: 'Grado', getValue: (r) => String(r.grade ?? '') },
            { key: 'decision', label: 'Decisión', getValue: (r) => String(r.decision ?? '') },
            { key: 'bonusesTotal', label: 'Bonos', getValue: (r) => String(r.bonusesTotal ?? 0) },
            { key: 'penaltiesTotal', label: 'Castigos', getValue: (r) => String(r.penaltiesTotal ?? 0) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
