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
import { listQualityPhotos } from '../api/coffee';

export function CoffeeQualityPhotosPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    listQualityPhotos().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  const data = rows.map((r, i) =>
    withRowId({ ...r, id: String(r.id ?? r.photoKey ?? `photo-${i}`) } as Record<string, unknown>, 'id', 'photoKey'),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Fotografías de calidad"
        subtitle="Evidencia visual de muestras"
        actions={
          <PageActions>
            <Link to="/compras/calidad" className="btn">Panel calidad</Link>
          </PageActions>
        }
      />
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-quality-photos"
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
            { key: 'photoKey', label: 'Clave', getValue: (r) => String(r.photoKey) },
            { key: 'photoType', label: 'Tipo', getValue: (r) => String(r.photoType) },
            { key: 'storageUrl', label: 'URL', getValue: (r) => String(r.storageUrl ?? '—') },
            { key: 'caption', label: 'Caption', getValue: (r) => String(r.caption ?? '—') },
            {
              key: 'createdAt',
              label: 'Fecha',
              getValue: (r) => (r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : '—'),
            },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
