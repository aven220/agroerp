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
import type { RowAction } from '../lib/data-grid/types';
import { getQualitySample, listQualitySamples, updateSampleCustody } from '../api/coffee';

type SampleRow = Record<string, unknown> & { id: string };

export function CoffeeQualitySamplesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  const reload = () => listQualitySamples().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const data = rows.map((r) => withRowId(r, 'id', 'sampleKey'));

  const rowActions: RowAction<SampleRow>[] = [
    {
      id: 'history',
      label: 'Historial',
      onAction: (r) => {
        getQualitySample(String(r.sampleKey)).then(setDetail);
      },
    },
    {
      id: 'reanalysis',
      label: 'Reanálisis',
      onAction: (r) => {
        updateSampleCustody(String(r.sampleKey), {
          status: 'reanalysis',
          notes: 'Reanálisis solicitado',
        }).then(reload);
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Muestras y custodia"
        subtitle="Código único, ubicación, estado e historial"
        actions={
          <PageActions>
            <Link to="/compras/calidad" className="btn">Panel calidad</Link>
          </PageActions>
        }
      />
      <PageSection>
        <SimpleRecordsTable
          gridId="coffee-quality-samples"
          selectable={false}
          data={data}
          columns={[
            { key: 'sampleKey', label: 'Muestra', getValue: (r) => String(r.sampleKey) },
            { key: 'custodyCode', label: 'Custodia', getValue: (r) => String(r.custodyCode ?? '—') },
            {
              key: 'ticketKey',
              label: 'Ticket',
              getValue: (r) => String((r.ticket as Record<string, unknown> | undefined)?.ticketKey ?? ''),
            },
            { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
            { key: 'physicalLocation', label: 'Ubicación', getValue: (r) => String(r.physicalLocation ?? '—') },
            { key: 'reanalysisCount', label: 'Reanálisis', getValue: (r) => String(r.reanalysisCount ?? 0) },
          ]}
          rowActions={rowActions}
        />
      </PageSection>
      {detail ? (
        <PageSection title={`Custodia ${String(detail.sampleKey)}`}>
          <pre className="code-block">{JSON.stringify(detail, null, 2)}</pre>
        </PageSection>
      ) : null}
    </PageLayout>
  );
}
