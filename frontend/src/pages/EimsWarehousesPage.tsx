import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsWarehouses, upsertEimsWarehouse } from '../api/eims';

export function EimsWarehousesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    warehouseKey: '',
    name: '',
    warehouseType: 'warehouse',
    municipality: '',
    responsibleName: '',
  });

  const reload = () => listEimsWarehouses(true).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Bodegas y centros" subtitle="Bodegas, acopios, silos, patios y cuartos fríos" actions={<Link to="/inventario" className="btn">Inventario</Link>} />
      <section className="panel">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <input placeholder="Código de bodega" value={form.warehouseKey} onChange={(e) => setForm({ ...form, warehouseKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.warehouseType} onChange={(e) => setForm({ ...form, warehouseType: e.target.value })}>
            <option value="warehouse">Bodega</option>
            <option value="distribution_center">Centro de distribución</option>
            <option value="collection_center">Centro de acopio</option>
            <option value="store">Almacén</option>
            <option value="silo">Silo</option>
            <option value="yard">Patio</option>
            <option value="cold_room">Cuarto frío</option>
          </select>
          <input placeholder="Municipio" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
          <input placeholder="Responsable" value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} />
        </div>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => upsertEimsWarehouse(form).then(reload)}>Guardar bodega</button>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Municipio</th><th>Responsable</th><th>Activa</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.warehouseKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.warehouseType)}</td>
                <td>{String(r.municipality ?? '—')}</td>
                <td>{String(r.responsibleName ?? '—')}</td>
                <td>{r.isActive ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
