import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FormsPlatformNav } from '../components/forms/FormsPlatformNav';
import { useToast } from '../context/ToastContext';
import {
  downloadGeoJsonFromSubmissions,
  downloadJson,
  exportForm,
  listForms,
  listSubmissions,
  saveFormSchemaExport,
  saveFormsReport,
  type FormDefinition,
} from '../api/forms';

export function FormExportPage() {
  const toast = useToast();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [formId, setFormId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listForms().then(setForms);
  }, []);

  async function run(action: string, fn: () => Promise<unknown>) {
    setBusy(action);
    try {
      await fn();
      toast.success('Exportación lista');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setBusy(null);
    }
  }

  const selected = forms.find((f) => f.id === formId);

  return (
    <>
      <Header
        title="Exportación de Datos"
        subtitle="Excel, CSV, JSON, GeoJSON y esquemas de formulario"
      />
      <FormsPlatformNav />

      <section className="panel form-export-intro">
        <p className="muted">
          CSV y JSON exportan los <strong>datos del formulario</strong>. Las fotos y firmas
          no van dentro del CSV: se ven y descargan en <strong>Recolección → detalle del envío</strong>
          (sección Evidencias), después de sincronizar con la app de campo actualizada.
        </p>
        <label>
          Filtrar por formulario (opcional)
          <select value={formId} onChange={(e) => setFormId(e.target.value)}>
            <option value="">Todos</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.formKey})</option>
            ))}
          </select>
        </label>
      </section>

      <div className="form-export-grid">
        <article className="panel form-export-card">
          <h3>📊 Excel / CSV</h3>
          <p>Reporte tabular compatible con Excel. Incluye envíos y catálogo.</p>
          <div className="row-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy != null} onClick={() => run('csv-full', () => saveFormsReport('full', formId || undefined))}>
              Reporte completo
            </button>
            <button type="button" className="btn btn-sm" disabled={busy != null} onClick={() => run('csv-sub', () => saveFormsReport('submissions', formId || undefined))}>
              Solo envíos
            </button>
            <button type="button" className="btn btn-sm" disabled={busy != null} onClick={() => run('csv-cat', () => saveFormsReport('catalog'))}>
              Catálogo
            </button>
          </div>
        </article>

        <article className="panel form-export-card">
          <h3>{'{ }'} JSON</h3>
          <p>Datos estructurados para integraciones y respaldos.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy != null}
            onClick={() => run('json', async () => {
              const subs = await listSubmissions(formId ? { formId } : undefined);
              downloadJson(subs, `recoleccion-${new Date().toISOString().slice(0, 10)}.json`);
            })}
          >
            Descargar envíos JSON
          </button>
        </article>

        <article className="panel form-export-card">
          <h3>🗺 GeoJSON</h3>
          <p>Puntos GPS de registros para mapas y SIG.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy != null}
            onClick={() => run('geojson', async () => {
              const subs = await listSubmissions(formId ? { formId } : undefined);
              downloadGeoJsonFromSubmissions(subs);
            })}
          >
            Descargar GeoJSON
          </button>
        </article>

        <article className="panel form-export-card">
          <h3>📋 Esquema del formulario</h3>
          <p>Definición de campos (diseño), no respuestas.</p>
          {selected ? (
            <div className="row-actions">
              <button type="button" className="btn btn-sm" disabled={busy != null} onClick={() => run('schema-csv', () => saveFormSchemaExport(selected.id, selected.formKey, 'csv'))}>Campos CSV</button>
              <button type="button" className="btn btn-sm" disabled={busy != null} onClick={() => run('schema-json', () => saveFormSchemaExport(selected.id, selected.formKey, 'json'))}>JSON</button>
            </div>
          ) : (
            <p className="muted ds-caption">Seleccione un formulario arriba.</p>
          )}
        </article>

        <article className="panel form-export-card">
          <h3>📄 PDF</h3>
          <p>Vista imprimible del listado actual (navegador).</p>
          <button type="button" className="btn btn-sm" onClick={() => window.print()}>Imprimir / PDF</button>
        </article>

        <article className="panel form-export-card">
          <h3>🖼 Evidencias (fotos / firmas)</h3>
          <p className="muted">
            No se descargan en el CSV. Ábralas en <strong>Recolección</strong> seleccionando
            cada envío → sección Evidencias (vista previa y Descargar).
          </p>
          <Link to="/formularios/recoleccion" className="btn btn-sm">
            Ir a Recolección
          </Link>
        </article>
      </div>
    </>
  );
}
