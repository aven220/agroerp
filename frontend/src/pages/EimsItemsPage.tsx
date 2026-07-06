import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { addEimsItemPhoto, getEimsItemByCode, listEimsItems, upsertEimsItem } from '../api/eims';

export function EimsItemsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
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

  const reload = () => listEimsItems({ q: q || undefined }).then((r) => setItems(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Artículos de inventario"
        subtitle="Código, QR, barcode, controles y fotos"
        actions={<Link to="/inventario" className="btn">EIMS</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}

      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={reload}>Buscar</button>
          <input placeholder="QR / barcode" value={scan} onChange={(e) => setScan(e.target.value)} />
          <button
            className="btn"
            onClick={() =>
              getEimsItemByCode(scan)
                .then((item) => setItems([item]))
                .catch((e) => setError(e.message))
            }
          >
            Escanear
          </button>
        </div>
      </section>

      <section className="panel">
        <h3>Registrar / actualizar artículo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <input placeholder="itemKey" value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
          <input placeholder="UOM" value={form.uomKey} onChange={(e) => setForm({ ...form, uomKey: e.target.value })} />
          <label><input type="checkbox" checked={form.trackLot} onChange={(e) => setForm({ ...form, trackLot: e.target.checked })} /> Lote</label>
          <label><input type="checkbox" checked={form.trackSerial} onChange={(e) => setForm({ ...form, trackSerial: e.target.checked })} /> Serie</label>
          <label><input type="checkbox" checked={form.trackExpiry} onChange={(e) => setForm({ ...form, trackExpiry: e.target.checked })} /> Vencimiento</label>
        </div>
        <button
          className="btn"
          style={{ marginTop: 8 }}
          onClick={() =>
            upsertEimsItem(form)
              .then(() => addEimsItemPhoto(form.itemKey, { photoKey: `photo-${Date.now()}`, caption: 'Principal', isPrimary: true }))
              .then(reload)
              .catch((e) => setError(e.message))
          }
        >
          Guardar artículo
        </button>
      </section>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave</th><th>Nombre</th><th>Tipo</th><th>UOM</th><th>QR</th><th>Barcode</th>
              <th>Lote</th><th>Serie</th><th>Vence</th><th>Valoración</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={String(i.id ?? i.itemKey)}>
                <td>{String(i.itemKey)}</td>
                <td>{String(i.name)}</td>
                <td>{String(i.itemTypeKey)}</td>
                <td>{String(i.uomKey)}</td>
                <td>{String(i.qrCode ?? '—')}</td>
                <td>{String(i.barcode ?? '—')}</td>
                <td>{i.trackLot ? 'Sí' : 'No'}</td>
                <td>{i.trackSerial ? 'Sí' : 'No'}</td>
                <td>{i.trackExpiry ? 'Sí' : 'No'}</td>
                <td>{String(i.valuationMethod)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
