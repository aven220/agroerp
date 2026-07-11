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
import { listCoffeeConfigChanges } from '../api/coffee';

export function CoffeeConfigChangesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listCoffeeConfigChanges().then((r) => setRows(r as Array<Record<string, unknown>>)); }, []);

  const data = rows.map((r) => withRowId(r, 'id'));

  return (
    <PageLayout>
      <PageHeader
        title="Historial de cambios de configuración"
        subtitle="Quién, cuándo, versión, valor anterior/nuevo"
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-config-changes"
          selectable={false}
          data={data}
          columns={[
            { key: 'entityType', label: 'Entidad', getValue: (r) => String(r.entityType) },
            { key: 'entityKey', label: 'Clave', getValue: (r) => String(r.entityKey) },
            { key: 'action', label: 'Acción', getValue: (r) => String(r.action) },
            { key: 'version', label: 'Versión', getValue: (r) => String(r.version) },
            { key: 'reason', label: 'Motivo', getValue: (r) => String(r.reason ?? '—') },
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
