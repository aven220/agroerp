import { useEffect, useState } from 'react';
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
          Exporte resultados de recolección para análisis externo, auditoría o integración.
          Para archivos adjuntos (fotos, firmas) use el JSON completo; el paquete ZIP con medios requiere sincronización desde la app móvil.
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
          <h3>📦 ZIP (medios)</h3>
          <p className="muted">
            Incluya <code>photo</code>, <code>signature</code> y <code>file</code> en el JSON exportado.
            Descarga masiva de archivos desde almacenamiento se habilitará en sincronización móvil avanzada.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy != null}
            onClick={() => run('json-media', async () => {
              const subs = await listSubmissions(formId ? { formId } : undefined);
              const withMedia = subs.filter((s) => JSON.stringify(s.data).match(/photo|signature|file|gallery/i));
              downloadJson(withMedia, `recoleccion-medios-${new Date().toISOString().slice(0, 10)}.json`);
            })}
          >
            JSON con referencias a medios
          </button>
        </article>
      </div>
    </>
  );
}
