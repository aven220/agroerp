import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  BI_DATA_SOURCES,
  BI_REPORT_FORMATS,
  createBiQuery,
  downloadExport,
  executeBiQuery,
  listBiQueries,
  previewBiQuery,
} from '../api/bi';

export function BiQueryBuilderPage() {
  const [dataSource, setDataSource] = useState('producers');
  const [groupBy, setGroupBy] = useState('');
  const [limit, setLimit] = useState(100);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<Array<{ key: string; label: string }>>([]);
  const [saved, setSaved] = useState<Array<{ id: string; name: string; queryKey: string }>>([]);
  const [queryKey, setQueryKey] = useState('');
  const [queryName, setQueryName] = useState('');

  const definition = {
    dataSource,
    ...(groupBy ? { groupBy: [groupBy], aggregations: [{ field: 'id', fn: 'count' as const, alias: 'count' }] } : {}),
    limit,
  };

  useEffect(() => { listBiQueries().then(setSaved); }, []);

  async function handlePreview() {
    const result = await previewBiQuery(definition);
    setRows(result.rows);
    setColumns(result.columns);
  }

  async function handleExecute() {
    const result = await executeBiQuery(definition);
    setRows(result.rows);
    setColumns(result.columns);
  }

  async function handleSave() {
    await createBiQuery({
      queryKey: queryKey || `query-${Date.now()}`,
      name: queryName || 'Consulta visual',
      dataSource,
      definition,
    });
    listBiQueries().then(setSaved);
  }

  function handleExport(format: string) {
    const header = columns.length ? columns : Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
    const csv = [
      header.map((c) => c.label).join(','),
      ...rows.map((r) => header.map((c) => JSON.stringify(r[c.key] ?? '')).join(',')),
    ].join('\n');
    const mime = format === 'json' ? 'application/json' : 'text/csv';
    const content = format === 'json' ? JSON.stringify(rows, null, 2) : csv;
    downloadExport(content, `consulta.${format}`, mime);
  }

  return (
    <>
      <Header
        title="Constructor Visual de Consultas"
        subtitle="Sin SQL — filtros, agrupaciones y exportación"
        actions={<Link to="/bi" className="btn">Centro BI</Link>}
      />

      <div className="bi-query-builder panel">
        <div className="form-row">
          <label>
            Fuente de datos
            <select value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
              {BI_DATA_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Agrupar por
            <input value={groupBy} onChange={(e) => setGroupBy(e.target.value)} placeholder="ej. lifecycleStatus" />
          </label>
          <label>
            Límite
            <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
          </label>
        </div>
        <div className="row-actions">
          <button type="button" className="btn" onClick={handlePreview}>Vista previa</button>
          <button type="button" className="btn btn-primary" onClick={handleExecute}>Ejecutar</button>
        </div>
      </div>

      <div className="split-layout">
        <section className="panel">
          <h3>Resultados ({rows.length})</h3>
          <div className="row-actions" style={{ marginBottom: '0.5rem' }}>
            {BI_REPORT_FORMATS.slice(0, 4).map((f) => (
              <button key={f} type="button" className="btn btn-sm" onClick={() => handleExport(f)}>{f}</button>
            ))}
          </div>
          <table className="data-table data-table-compact">
            <thead>
              <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => <td key={c.key}>{String(row[c.key] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Guardar consulta</h3>
          <label>Clave<input value={queryKey} onChange={(e) => setQueryKey(e.target.value)} /></label>
          <label>Nombre<input value={queryName} onChange={(e) => setQueryName(e.target.value)} /></label>
          <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar</button>
          <h4 style={{ marginTop: '1rem' }}>Guardadas</h4>
          <ul className="stat-list">
            {saved.map((q) => (
              <li key={q.id}><span>{q.name}</span><strong>{q.queryKey}</strong></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
