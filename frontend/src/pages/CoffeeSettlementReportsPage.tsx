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
import { getSettlementKpis, listCoffeeSettlements } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeSettlementReportsPage() {
  const [kpis, setKpis] = useState<Record<string, unknown> | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    getSettlementKpis().then(setKpis);
    listCoffeeSettlements().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  if (!kpis) return <LoadingState variant="page" message="Cargando reportes…" />;

  const data = rows.map((r) => withRowId(r, 'id', 'settlementKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Reportes y KPIs de liquidación"
        subtitle="Totales, pagos y calidad aplicada"
        actions={
          <PageActions>
            <Link to="/compras/liquidaciones" className="btn">Centro liquidaciones</Link>
          </PageActions>
        }
      />
      <PageSummary>
        <MetricCard label="Liquidaciones" value={String(kpis.count)} />
        <MetricCard label="Kg liquidados" value={Number(kpis.kgSettled ?? 0).toLocaleString()} />
        <MetricCard label="Bonificaciones" value={Number(kpis.bonusesTotal ?? 0).toLocaleString()} />
        <MetricCard label="Castigos" value={Number(kpis.penaltiesTotal ?? 0).toLocaleString()} />
        <MetricCard label="Pagadas" value={String(kpis.paidCount)} />
        <MetricCard label="Parciales" value={String(kpis.partialCount)} />
        <MetricCard label="Pendientes pago" value={String(kpis.pendingCount)} />
        <MetricCard label="Saldo" value={Number(kpis.outstanding ?? 0).toLocaleString()} />
      </PageSummary>
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-settlement-reports"
          selectable={false}
          data={data}
          columns={[
            { key: 'settlementKey', label: 'Liquidación', getValue: (r) => String(r.settlementKey) },
            {
              key: 'producerName',
              label: 'Productor',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.producerName ?? ''),
            },
            { key: 'netWeightKg', label: 'Neto', getValue: (r) => String(r.netWeightKg) },
            {
              key: 'bonusesTotal',
              label: 'Bonos',
              getValue: (r) => Number(r.bonusesTotal ?? 0).toLocaleString(),
            },
            {
              key: 'penaltiesTotal',
              label: 'Castigos',
              getValue: (r) => Number(r.penaltiesTotal ?? 0).toLocaleString(),
            },
            {
              key: 'totalAmount',
              label: 'Total',
              getValue: (r) => Number(r.totalAmount).toLocaleString(),
            },
            { key: 'paymentStatus', label: 'Estado', getValue: (r) => String(r.paymentStatus) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
