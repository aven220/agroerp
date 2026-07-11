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
import { listCoffeeTickets, type CoffeeTicket } from '../api/coffee';
import { labelTicketStatus } from '../lib/productLabels';

export function CoffeeHistoryPage() {
  const [tickets, setTickets] = useState<CoffeeTicket[]>([]);
  useEffect(() => { listCoffeeTickets().then(setTickets); }, []);

  const data = tickets.map((t) => withRowId(t as unknown as Record<string, unknown>, 'id', 'ticketKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Historial de compras"
        subtitle="Consultas y trazabilidad"
        actions={
          <PageActions>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-history"
          selectable={false}
          data={data}
          columns={[
            { key: 'ticketKey', label: 'Ticket', getValue: (r) => String(r.ticketKey) },
            { key: 'producerName', label: 'Productor', getValue: (r) => String(r.producerName) },
            { key: 'farmName', label: 'Finca', getValue: (r) => String(r.farmName) },
            { key: 'lotCode', label: 'Lote', getValue: (r) => String(r.lotCode) },
            {
              key: 'status',
              label: 'Estado',
              getValue: (r) => labelTicketStatus(String(r.status ?? '')),
            },
            {
              key: 'createdAt',
              label: 'Fecha',
              getValue: (r) => new Date(String(r.createdAt)).toLocaleString(),
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
