import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import { getEimsAudit } from '../api/eims';

type AuditRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<AuditRow>[] = [
  { key: 'entityType', label: 'Entidad', getValue: (r) => String(r.entityType ?? '') },
  { key: 'entityKey', label: 'Clave', getValue: (r) => String(r.entityKey ?? '') },
  { key: 'action', label: 'Acción', getValue: (r) => String(r.action ?? '') },
  { key: 'userId', label: 'Usuario', getValue: (r) => String(r.userId ?? '—') },
  {
    key: 'createdAt',
    label: 'Fecha',
    getValue: (r) => (r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'),
  },
];

export function EimsAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => {
    getEimsAudit().then((r) =>
      setRows(
        (r as Array<Record<string, unknown>>).map((row, i) =>
          withRowId({ ...row, _idx: i }, 'id', 'entityKey', '_idx'),
        ),
      ),
    );
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Auditoría de inventario"
        subtitle="Creación, edición y configuración"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />

      <PageSection title="Eventos de auditoría">
        <SimpleRecordsTable
          gridId="eims-audit"
          columns={columns}
          data={rows}
          selectable={false}
          emptyMessage="Sin eventos"
        />
      </PageSection>
    </PageLayout>
  );
}
