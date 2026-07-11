import { useEffect, useState } from 'react';
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
import { listCoffeePrices, upsertCoffeePrice } from '../api/coffee';

export function CoffeeConfigPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [price, setPrice] = useState(12000);
  const reload = () => listCoffeePrices().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  const data = rows.map((r) => withRowId(r, 'id', 'configKey'));

  return (
    <PageLayout>
      <PageHeader
        title="Configuración de precios"
        subtitle="Precio base, bonificaciones, descuentos, impuestos, retenciones"
        actions={
          <PageActions>
            <Link to="/compras/config" className="btn">Config</Link>
          </PageActions>
        }
      />

      <PageSection title="Precios">
        <PageToolbar>
          <FieldGroup label="Precio base / kg">
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </FieldGroup>
        </PageToolbar>
        <FormActions>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => upsertCoffeePrice({ configKey: 'default', name: 'Precio estándar', basePricePerKg: price, withholdingPct: 1.5 }).then(reload)}
          >
            Guardar precio
          </button>
        </FormActions>
        <SimpleRecordsTable
          gridId="coffee-config-prices"
          selectable={false}
          data={data}
          columns={[
            { key: 'configKey', label: 'Clave', getValue: (r) => String(r.configKey) },
            { key: 'name', label: 'Nombre', getValue: (r) => String(r.name) },
            { key: 'basePricePerKg', label: 'Precio/kg', getValue: (r) => String(r.basePricePerKg) },
            { key: 'withholdingPct', label: 'Retención %', getValue: (r) => String(r.withholdingPct) },
          ]}
        />
      </PageSection>
    </PageLayout>
  );
}
