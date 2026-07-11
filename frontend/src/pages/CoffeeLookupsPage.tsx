import { useState } from 'react';
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
import type { RowAction } from '../lib/data-grid/types';
import { getCoffeeProducer, listCoffeeFarms, listCoffeeLots, searchCoffeeProducers } from '../api/coffee';

type ProducerRow = Record<string, unknown> & { id: string };
type FarmRow = Record<string, unknown> & { id: string };

export function CoffeeLookupsPage() {
  const [q, setQ] = useState('');
  const [producers, setProducers] = useState<Array<Record<string, unknown>>>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [farms, setFarms] = useState<Array<Record<string, unknown>>>([]);
  const [lots, setLots] = useState<Array<Record<string, unknown>>>([]);

  const search = async () => {
    const rows = await searchCoffeeProducers(q);
    setProducers(rows as Array<Record<string, unknown>>);
  };

  const openProducer = async (id: string) => {
    const p = await getCoffeeProducer(id) as Record<string, unknown>;
    setDetail(p);
    const f = await listCoffeeFarms(id);
    setFarms(f as Array<Record<string, unknown>>);
    setLots([]);
  };

  const openFarm = async (farmId: string) => {
    const l = await listCoffeeLots(farmId);
    setLots(l as Array<Record<string, unknown>>);
  };

  const producerData = producers.map((p) => withRowId(p, 'id', 'producerCode'));
  const farmData = farms.map((f) => withRowId(f, 'id', 'farmCode'));
  const lotData = lots.map((l) => withRowId(l, 'id', 'lotCode'));

  const producerActions: RowAction<ProducerRow>[] = [
    {
      id: 'view',
      label: 'Ver',
      onAction: (r) => {
        openProducer(String(r.id));
      },
    },
  ];

  const farmActions: RowAction<FarmRow>[] = [
    {
      id: 'lots',
      label: 'Lotes',
      onAction: (r) => {
        openFarm(String(r.id));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Consultas"
        subtitle="Productor, finca, lotes e historial"
        actions={
          <PageActions>
            <Link to="/compras" className="btn">Centro</Link>
          </PageActions>
        }
      />
      <PageSection title="Productores">
        <PageToolbar>
          <FieldGroup label="Buscar">
            <input placeholder="Buscar productor" value={q} onChange={(e) => setQ(e.target.value)} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button type="button" className="btn" onClick={search}>Buscar</button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-lookups-producers"
          selectable={false}
          data={producerData}
          columns={[
            { key: 'producerCode', label: 'Código', getValue: (r) => String(r.producerCode) },
            { key: 'producerName', label: 'Nombre', getValue: (r) => String(r.producerName) },
            { key: 'identityDoc', label: 'Documento', getValue: (r) => String(r.identityDoc ?? '') },
          ]}
          rowActions={producerActions}
        />
      </PageSection>
      {detail && (
        <PageSection title="Historial productor">
          <pre className="code-block">{JSON.stringify(detail.purchaseHistory, null, 2)}</pre>
        </PageSection>
      )}
      <PageSection title="Fincas">
        <SimpleRecordsTable
          gridId="coffee-lookups-farms"
          selectable={false}
          data={farmData}
          columns={[
            { key: 'farmCode', label: 'Código', getValue: (r) => String(r.farmCode) },
            { key: 'farmName', label: 'Nombre', getValue: (r) => String(r.farmName) },
          ]}
          rowActions={farmActions}
        />
      </PageSection>
      <PageSection title="Lotes">
        <SimpleRecordsTable
          gridId="coffee-lookups-lots"
          selectable={false}
          data={lotData}
          columns={[
            { key: 'lotCode', label: 'Código', getValue: (r) => String(r.lotCode) },
            { key: 'lotName', label: 'Nombre', getValue: (r) => String(r.lotName) },
            { key: 'status', label: 'Estado', getValue: (r) => String(r.status) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
