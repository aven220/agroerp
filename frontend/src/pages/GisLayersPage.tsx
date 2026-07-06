import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  GisLayer,
  createGisLayer,
  listGisLayers,
  publishGisLayer,
  refreshGisLayer,
} from '../api/gis';

export function GisLayersPage() {
  const [layers, setLayers] = useState<GisLayer[]>([]);
  const [form, setForm] = useState({
    layerCode: '',
    layerName: '',
    sourceModule: 'PRM',
    geometryType: 'Point',
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const reload = () => {
    setLoading(true);
    listGisLayers()
      .then(setLayers)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const created = await createGisLayer(form);
      await publishGisLayer(created.id);
      await refreshGisLayer(created.id);
      setMessage('Capa creada y publicada');
      setForm({ layerCode: '', layerName: '', sourceModule: 'PRM', geometryType: 'Point' });
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al crear capa');
    }
  };

  return (
    <>
      <Header
        title="Administrador de capas"
        subtitle="CRUD LayerDefinition EGSIP"
        actions={<Link to="/gis" className="btn">Mapa</Link>}
      />

      {message && <div className="alert">{message}</div>}

      <form className="form-grid panel" onSubmit={onSubmit}>
        <label>
          Código
          <input value={form.layerCode} onChange={(e) => setForm({ ...form, layerCode: e.target.value })} required />
        </label>
        <label>
          Nombre
          <input value={form.layerName} onChange={(e) => setForm({ ...form, layerName: e.target.value })} required />
        </label>
        <label>
          Módulo origen
          <select value={form.sourceModule} onChange={(e) => setForm({ ...form, sourceModule: e.target.value })}>
            <option value="PRM">Productores</option>
            <option value="FTIP">Fincas</option>
            <option value="FMDT">Lotes</option>
            <option value="UDFE">Formularios</option>
            <option value="EGSIP">Geocercas</option>
          </select>
        </label>
        <label>
          Tipo geometría
          <select value={form.geometryType} onChange={(e) => setForm({ ...form, geometryType: e.target.value })}>
            <option value="Point">Punto</option>
            <option value="Polygon">Polígono</option>
            <option value="Line">Línea</option>
            <option value="Mixed">Mixto</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary">Crear capa</button>
      </form>

      <section className="panel">
        <h3>Capas registradas</h3>
        {loading ? <p>Cargando...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id}>
                  <td>{l.layerCode}</td>
                  <td>{l.layerName}</td>
                  <td>{l.sourceModule}</td>
                  <td>{l.status}</td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => refreshGisLayer(l.id).then(reload)}>
                      Refresh
                    </button>
                    {l.status === 'draft' && (
                      <button type="button" className="btn btn-sm" onClick={() => publishGisLayer(l.id).then(reload)}>
                        Publicar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
