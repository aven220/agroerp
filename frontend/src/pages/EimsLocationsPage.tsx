import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsLocations, listEimsWarehouses, upsertEimsLocation } from '../api/eims';

export function EimsLocationsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    warehouseKey: 'WH-MAIN',
    name: '',
    locationType: 'position',
    aisle: '',
    shelf: '',
    level: '',
    position: '',
  });

  const reload = () => listEimsLocations(form.warehouseKey || undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    listEimsWarehouses().then((r) => setWarehouses(r as Array<Record<string, unknown>>));
    reload();
  }, []);

  return (
    <>
      <Header title="Ubicaciones" subtitle="Pasillos, estanterías, niveles y posiciones" actions={<Link to="/inventario" className="btn">EIMS</Link>} />
      <section className="panel">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <select value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })}>
            {warehouses.map((w) => (
              <option key={String(w.warehouseKey)} value={String(w.warehouseKey)}>{String(w.name)}</option>
            ))}
          </select>
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value })}>
            <option value="internal">Interna</option>
            <option value="aisle">Pasillo</option>
            <option value="shelf">Estantería</option>
            <option value="level">Nivel</option>
            <option value="position">Posición</option>
          </select>
          <input placeholder="Pasillo" value={form.aisle} onChange={(e) => setForm({ ...form, aisle: e.target.value })} />
          <input placeholder="Estantería" value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
          <input placeholder="Nivel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          <input placeholder="Posición" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </div>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => upsertEimsLocation(form).then(reload)}>Guardar ubicación</button>
        <button className="btn" style={{ marginTop: 8, marginLeft: 8 }} onClick={reload}>Consultar</button>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Pasillo</th><th>Estante</th><th>Nivel</th><th>Posición</th><th>QR</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.locationKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.locationType)}</td>
                <td>{String(r.aisle ?? '—')}</td>
                <td>{String(r.shelf ?? '—')}</td>
                <td>{String(r.level ?? '—')}</td>
                <td>{String(r.position ?? '—')}</td>
                <td>{String(r.qrCode ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
