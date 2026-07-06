import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listSubmissions, saveFormsReport, type FormSubmission } from '../api/forms';
import { LoadingState } from '../components/ux/LoadingState';

export function FormSubmissionsPage() {
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listSubmissions().then(setItems).finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await saveFormsReport('submissions');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo descargar el reporte');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Header
        title="Envíos de formularios"
        subtitle="Capturas y sincronización"
        actions={
          <div className="row-actions">
            <Link to="/formularios" className="btn">Catálogo</Link>
            <button type="button" className="btn btn-primary" disabled={exporting} onClick={handleExport}>
              {exporting ? 'Generando...' : 'Descargar envíos (Excel)'}
            </button>
          </div>
        }
      />
      {loading ? <LoadingState variant="table" message="Cargando..." /> : (
        <table className="data-table">
          <thead>
            <tr><th>Formulario</th><th>Versión</th><th>Estado</th><th>Sync</th><th>Fecha</th><th>Datos</th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="muted">Sin envíos</td></tr>
            ) : items.map((s) => (
              <tr key={s.id}>
                <td>{s.form?.name ?? s.formId}</td>
                <td>v{s.formVersion}</td>
                <td>{s.status}</td>
                <td>{s.syncStatus}</td>
                <td>{new Date(s.createdAt).toLocaleString('es-CO')}</td>
                <td><pre className="code-inline">{JSON.stringify(s.data).slice(0, 80)}...</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
