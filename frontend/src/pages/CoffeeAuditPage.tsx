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
import { getCoffeeAudit } from '../api/coffee';

export function CoffeeAuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { getCoffeeAudit().then((r) => setRows(r as Array<Record<string, unknown>>)); }, []);

  const data = rows.map((r) => withRowId(r, 'id'));

  return (
    <PageLayout>
      <PageHeader
        title="Auditoría de compras"
        subtitle="Eventos y acciones"
        actions={
          <PageActions>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-audit"
          selectable={false}
          data={data}
          columns={[
            { key: 'entityType', label: 'Entidad', getValue: (r) => String(r.entityType) },
            { key: 'entityKey', label: 'Clave', getValue: (r) => String(r.entityKey) },
            { key: 'action', label: 'Acción', getValue: (r) => String(r.action) },
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
