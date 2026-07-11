import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  TableToolbar,
  FieldGroup,
  FormActions,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import { addEimsItemPhoto, getEimsItemByCode, listEimsItems, upsertEimsItem } from '../api/eims';

type ItemRow = Record<string, unknown> & { id: string };

const columns: SimpleColumn<ItemRow>[] = [
  { key: 'itemKey', label: 'Clave', getValue: (r) => String(r.itemKey ?? '') },
  { key: 'name', label: 'Nombre', getValue: (r) => String(r.name ?? '') },
  { key: 'itemTypeKey', label: 'Tipo', getValue: (r) => String(r.itemTypeKey ?? '') },
  { key: 'uomKey', label: 'UOM', getValue: (r) => String(r.uomKey ?? '') },
  { key: 'qrCode', label: 'QR', getValue: (r) => String(r.qrCode ?? '—') },
  { key: 'barcode', label: 'Barcode', getValue: (r) => String(r.barcode ?? '—') },
  { key: 'trackLot', label: 'Lote', getValue: (r) => (r.trackLot ? 'Sí' : 'No') },
  { key: 'trackSerial', label: 'Serie', getValue: (r) => (r.trackSerial ? 'Sí' : 'No') },
  { key: 'trackExpiry', label: 'Vence', getValue: (r) => (r.trackExpiry ? 'Sí' : 'No') },
  { key: 'valuationMethod', label: 'Valoración', getValue: (r) => String(r.valuationMethod ?? '') },
];

export function EimsItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [q, setQ] = useState('');
  const [scan, setScan] = useState('');
  const [form, setForm] = useState({
    itemKey: '',
    name: '',
    itemTypeKey: 'coffee_parchment',
    uomKey: 'kg',
    categoryKey: 'coffee',
    trackLot: true,
    trackSerial: false,
    trackExpiry: false,
  });
  const [error, setError] = useState('');

  const reload = () =>
    listEimsItems({ q: q || undefined }).then((r) =>
      setItems((r as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id', 'itemKey'))),
    );
  useEffect(() => { reload(); }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Artículos de inventario"
        subtitle="Registre productos, unidades de medida y códigos de barras"
        actions={
          <PageActions>
            <Link to="/inventario" className="btn">Inventario</Link>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Búsqueda">
        <TableToolbar>
          <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={reload}>Buscar</button>
          <input placeholder="Código de barras o QR" value={scan} onChange={(e) => setScan(e.target.value)} />
          <button
            className="btn"
            onClick={() =>
              getEimsItemByCode(scan)
                .then((item) => setItems([withRowId(item as Record<string, unknown>, 'id', 'itemKey')]))
                .catch((e) => setError(e.message))
            }
          >
            Escanear
          </button>
        </TableToolbar>
      </PageSection>

      <PageSection title="Registrar / actualizar artículo">
        <div className="form-grid">
          <FieldGroup label="Código del artículo">
            <input placeholder="Código del artículo" value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Nombre del artículo">
            <input placeholder="Nombre del artículo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Tipo">
            <select value={form.itemTypeKey} onChange={(e) => setForm({ ...form, itemTypeKey: e.target.value })}>
              <option value="coffee_parchment">Café pergamino</option>
              <option value="coffee_green">Café verde</option>
              <option value="coffee_roasted">Café tostado</option>
              <option value="coffee_ground">Café molido</option>
              <option value="fertilizer">Fertilizantes</option>
              <option value="agrochemical">Agroquímicos</option>
              <option value="tool">Herramientas</option>
              <option value="equipment">Equipos</option>
              <option value="packaging">Empaques</option>
              <option value="fuel">Combustibles</option>
              <option value="finished_good">Productos terminados</option>
              <option value="raw_material">Materias primas</option>
              <option value="other">Otros</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Unidad">
            <input placeholder="Unidad (ej. kg, litro, unidad)" value={form.uomKey} onChange={(e) => setForm({ ...form, uomKey: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Control por lote">
            <label><input type="checkbox" checked={form.trackLot} onChange={(e) => setForm({ ...form, trackLot: e.target.checked })} /> Control por lote</label>
          </FieldGroup>
          <FieldGroup label="Control por serie">
            <label><input type="checkbox" checked={form.trackSerial} onChange={(e) => setForm({ ...form, trackSerial: e.target.checked })} /> Control por serie</label>
          </FieldGroup>
          <FieldGroup label="Control de vencimiento">
            <label><input type="checkbox" checked={form.trackExpiry} onChange={(e) => setForm({ ...form, trackExpiry: e.target.checked })} /> Control de vencimiento</label>
          </FieldGroup>
        </div>
        <FormActions sticky={false}>
          <button
            className="btn btn-primary"
            onClick={() =>
              upsertEimsItem(form)
                .then(() => addEimsItemPhoto(form.itemKey, { photoKey: `photo-${Date.now()}`, caption: 'Principal', isPrimary: true }))
                .then(reload)
                .catch((e) => setError(e.message))
            }
          >
            Guardar artículo
          </button>
        </FormActions>
      </PageSection>

      <PageSection title="Artículos registrados">
        <SimpleRecordsTable
          gridId="eims-items"
          columns={columns}
          data={items}
          selectable={false}
          emptyMessage="Sin artículos"
        />
      </PageSection>
    </PageLayout>
  );
}
