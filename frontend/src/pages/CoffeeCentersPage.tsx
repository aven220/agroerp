import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  FormActions,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { listCoffeePurchaseCenters, listCoffeeReceptionRules, upsertCoffeePurchaseCenter, upsertCoffeeReceptionRule } from '../api/coffee';

export function CoffeeCentersPage() {
  const [centers, setCenters] = useState<Array<Record<string, unknown>>>([]);
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => {
    listCoffeePurchaseCenters(true).then((r) => setCenters(r as Array<Record<string, unknown>>));
    listCoffeeReceptionRules().then((r) => setRules(r as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  const centerData = centers.map((c) => withRowId(c, 'id', 'centerKey'));
  const ruleData = rules.map((r) => withRowId(r, 'id', 'ruleKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Centros de compra y balanzas"
        subtitle="Centros, acopio y reglas por centro"
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />
      <PageSection title="Centros">
        <FormActions>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => upsertCoffeePurchaseCenter({ centerKey: `centro_${Date.now()}`, name: 'Nuevo centro', reason: 'UI create' }).then(reload)}
          >
            Nuevo centro
          </button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-centers"
          selectable={false}
          data={centerData}
          columns={[
            { key: 'centerKey', label: 'Key', getValue: (r) => String(r.centerKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            { key: 'centerType', label: 'Tipo', getValue: (r) => String(r.centerType) },
            { key: 'isActive', label: 'Activo', getValue: (r) => String(r.isActive) },
          ]}
        />
      </PageSection>
      <PageSection title="Reglas de recepción">
        <FormActions>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => upsertCoffeeReceptionRule({
              ruleKey: `rule_${Date.now()}`,
              name: 'Regla horaria',
              openTime: '06:00',
              closeTime: '18:00',
              maxHumidityPct: 12.5,
              minFactor: 85,
              reason: 'UI create',
            }).then(reload)}
          >
            Nueva regla
          </button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-reception-rules"
          selectable={false}
          data={ruleData}
          columns={[
            { key: 'ruleKey', label: 'Key', getValue: (r) => String(r.ruleKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            {
              key: 'schedule',
              label: 'Horario',
              getValue: (r) => `${String(r.openTime ?? '—')}-${String(r.closeTime ?? '—')}`,
            },
            { key: 'maxHumidityPct', label: 'Humedad max', getValue: (r) => String(r.maxHumidityPct ?? '—') },
            { key: 'isActive', label: 'Activa', getValue: (r) => String(r.isActive) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
