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
import { getInventoryCosts, getInventoryKardex } from '../api/coffee';

export function CoffeeKardexPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [costs, setCosts] = useState<Array<Record<string, unknown>>>([]);
  const [lotKey, setLotKey] = useState('');

  const reload = () => {
    getInventoryKardex(lotKey || undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
    getInventoryCosts(lotKey || undefined).then((r) => setCosts(r as Array<Record<string, unknown>>));
  };

  useEffect(() => { reload(); }, []);

  const kardexData = rows.map((r, i) =>
    withRowId({ ...r, id: String(r.id ?? `kardex-${i}`) } as Record<string, unknown>, 'id'),
  );
  const costData = costs.map((c, i) =>
    withRowId({ ...c, id: String(c.id ?? `cost-${i}`) } as Record<string, unknown>, 'id'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Kardex y costos"
        subtitle="Entradas, salidas, saldo y revalorizaciones"
        actions={
          <PageActions>
            <Link to="/compras/inventario" className="btn">Inventario</Link>
            <Link to="/compras/trazabilidad" className="btn">Trazabilidad</Link>
          </PageActions>
        }
      />
      <PageSection title="Filtro">
        <PageToolbar>
          <FieldGroup label="Lote">
            <input placeholder="Filtrar por lote" value={lotKey} onChange={(e) => setLotKey(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn" onClick={reload}>Filtrar</button>
        </FormActions>
      </PageSection>
      <PageSection title="Kardex">
        <SimpleRecordsTable
          gridId="coffee-kardex"
          selectable={false}
          data={kardexData}
          columns={[
            {
              key: 'lotKey',
              label: 'Lote',
              getValue: (r) => String((r.lot as Record<string, unknown> | undefined)?.lotKey ?? ''),
            },
            { key: 'movementType', label: 'Tipo', getValue: (r) => String(r.movementType) },
            { key: 'entryKg', label: 'Entrada', getValue: (r) => String(r.entryKg) },
            { key: 'exitKg', label: 'Salida', getValue: (r) => String(r.exitKg) },
            { key: 'balanceKg', label: 'Saldo kg', getValue: (r) => String(r.balanceKg) },
            {
              key: 'unitCost',
              label: 'Costo unit.',
              getValue: (r) => Number(r.unitCost ?? 0).toLocaleString(),
            },
            {
              key: 'averageCost',
              label: 'Costo prom.',
              getValue: (r) => Number(r.averageCost ?? 0).toLocaleString(),
            },
            {
              key: 'balanceCost',
              label: 'Saldo $',
              getValue: (r) => Number(r.balanceCost ?? 0).toLocaleString(),
            },
            {
              key: 'postedAt',
              label: 'Fecha',
              getValue: (r) => (r.postedAt ? new Date(String(r.postedAt)).toLocaleString() : '—'),
            },
          ]}
        />
      </PageSection>
      <PageSection title="Historial de costos">
        <SimpleRecordsTable
          gridId="coffee-kardex-costs"
          selectable={false}
          data={costData}
          columns={[
            {
              key: 'lotKey',
              label: 'Lote',
              getValue: (r) => String((r.lot as Record<string, unknown> | undefined)?.lotKey ?? ''),
            },
            { key: 'eventType', label: 'Evento', getValue: (r) => String(r.eventType) },
            {
              key: 'previousUnitCost',
              label: 'Unit. ant.',
              getValue: (r) => Number(r.previousUnitCost ?? 0).toLocaleString(),
            },
            {
              key: 'newUnitCost',
              label: 'Unit. nuevo',
              getValue: (r) => Number(r.newUnitCost ?? 0).toLocaleString(),
            },
            {
              key: 'previousAverageCost',
              label: 'Prom. ant.',
              getValue: (r) => Number(r.previousAverageCost ?? 0).toLocaleString(),
            },
            {
              key: 'newAverageCost',
              label: 'Prom. nuevo',
              getValue: (r) => Number(r.newAverageCost ?? 0).toLocaleString(),
            },
            { key: 'reason', label: 'Motivo', getValue: (r) => String(r.reason ?? '—') },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
