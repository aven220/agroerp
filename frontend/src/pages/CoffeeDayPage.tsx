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
import { getCoffeePurchasesToday, type CoffeeTicket } from '../api/coffee';
import { labelTicketStatus } from '../lib/productLabels';

export function CoffeeDayPage() {
  const [rows, setRows] = useState<CoffeeTicket[]>([]);
  useEffect(() => { getCoffeePurchasesToday().then(setRows); }, []);

  const kg = rows.reduce((s, r) => s + (r.netWeightKg ?? 0), 0);
  const data = rows.map((t) => withRowId(t as unknown as Record<string, unknown>, 'id', 'ticketKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Compras del día"
        subtitle="Operación diaria de recepción"
        actions={
          <PageActions>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />
      <PageSummary>
        <MetricCard label="Tickets" value={rows.length} />
        <MetricCard label="Kg netos" value={kg.toFixed(0)} />
      </PageSummary>
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-day"
          selectable={false}
          data={data}
          columns={[
            { key: 'ticketKey', label: 'Ticket', getValue: (r) => String(r.ticketKey) },
            { key: 'producerName', label: 'Productor', getValue: (r) => String(r.producerName) },
            { key: 'turnNumber', label: 'Turno', getValue: (r) => String(r.turnNumber ?? '—') },
            {
              key: 'status',
              label: 'Estado',
              getValue: (r) => labelTicketStatus(String(r.status ?? '')),
            },
            { key: 'netWeightKg', label: 'Neto kg', getValue: (r) => String(r.netWeightKg ?? '—') },
            {
              key: 'createdAt',
              label: 'Hora',
              getValue: (r) => new Date(String(r.createdAt)).toLocaleTimeString(),
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
