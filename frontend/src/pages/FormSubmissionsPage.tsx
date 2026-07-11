import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  SimpleRecordsTable,
  type SimpleColumn,
} from '../components/page';
import { listSubmissions, saveFormsReport, type FormSubmission } from '../api/forms';

const columns: SimpleColumn<FormSubmission>[] = [
  {
    key: 'form',
    label: 'Formulario',
    getValue: (r) => r.form?.name ?? r.formId,
  },
  {
    key: 'formVersion',
    label: 'Versión',
    getValue: (r) => `v${r.formVersion}`,
  },
  { key: 'status', label: 'Estado', getValue: (r) => r.status },
  { key: 'syncStatus', label: 'Sync', getValue: (r) => r.syncStatus },
  {
    key: 'createdAt',
    label: 'Fecha',
    getValue: (r) => new Date(r.createdAt).toLocaleString('es-CO'),
  },
  {
    key: 'data',
    label: 'Datos',
    render: (r) => (
      <pre className="code-inline">{JSON.stringify(r.data).slice(0, 80)}...</pre>
    ),
    getValue: (r) => JSON.stringify(r.data).slice(0, 80),
  },
];

export function FormSubmissionsPage() {
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listSubmissions()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false));
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
    <PageLayout>
      <PageHeader
        title="Envíos de formularios"
        subtitle="Capturas y sincronización"
        actions={
          <PageActions>
            <Link to="/formularios" className="btn">Catálogo</Link>
            <button type="button" className="btn btn-primary" disabled={exporting} onClick={handleExport}>
              {exporting ? 'Generando...' : 'Descargar envíos (Excel)'}
            </button>
          </PageActions>
        }
      />
      {error ? <PageState variant="error" message={error} /> : null}

      <PageSection title="Envíos">
        <SimpleRecordsTable
          gridId="form-submissions"
          columns={columns}
          data={items}
          loading={loading}
          selectable={false}
          emptyMessage="Sin envíos"
        />
      </PageSection>
    </PageLayout>
  );
}
