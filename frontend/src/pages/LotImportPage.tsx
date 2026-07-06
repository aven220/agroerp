import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getImportTemplate, importLots, validateLotImport } from '../api/fmdt';

interface ImportRow {
  ftipLotUnitId: string;
  lotName: string;
  lotTypeCode?: string;
  primaryCropCode?: string;
  varietyCodes?: string;
  plantedAreaHa?: number;
  responsibleProducerId?: string;
  observations?: string;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  preview: Array<Record<string, unknown>>;
}

export function LotImportPage() {
  const [csvText, setCsvText] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseCsv(text: string): ImportRow[] {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? '';
      });
      return {
        ftipLotUnitId: row.ftipLotUnitId ?? '',
        lotName: row.lotName ?? '',
        lotTypeCode: row.lotTypeCode || undefined,
        primaryCropCode: row.primaryCropCode || undefined,
        varietyCodes: row.varietyCodes || undefined,
        plantedAreaHa: row.plantedAreaHa ? Number(row.plantedAreaHa) : undefined,
        responsibleProducerId: row.responsibleProducerId || undefined,
        observations: row.observations || undefined,
      };
    });
  }

  async function downloadTemplate() {
    const template = await getImportTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-lotes-fmdt.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const items = parseCsv(csvText) as unknown as Record<string, unknown>[];
      const result = await validateLotImport(items) as ValidationResult;
      setValidation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de validación');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(force = false) {
    setLoading(true);
    setError(null);
    try {
      const items = parseCsv(csvText) as unknown as Record<string, unknown>[];
      const result = await importLots(items, { force });
      setImportResult(result as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de importación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Importación masiva de lotes"
        subtitle="Plantilla CSV · validación previa · rollback automático"
        actions={
          <div className="row-actions">
            <Link to="/lotes" className="btn">Volver</Link>
            <button type="button" className="btn" onClick={downloadTemplate}>
              Descargar plantilla
            </button>
          </div>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      <form className="form-panel" onSubmit={handleValidate}>
        <div className="form-group">
          <label>Contenido CSV</label>
          <textarea
            rows={12}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setValidation(null);
              setImportResult(null);
            }}
            placeholder="Pegue el contenido del archivo CSV o descargue la plantilla oficial"
          />
        </div>
        <div className="row-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || !csvText.trim()}>
            Validar
          </button>
          <button
            type="button"
            className="btn"
            disabled={loading || !csvText.trim()}
            onClick={() => handleImport(false)}
          >
            Importar
          </button>
          {validation && !validation.valid && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={loading}
              onClick={() => handleImport(true)}
            >
              Forzar importación
            </button>
          )}
        </div>
      </form>

      {validation && (
        <div className={`panel ${validation.valid ? 'panel-success' : 'panel-warn'}`}>
          <h3>Resultado de validación</h3>
          <p>
            {validation.validRows} de {validation.totalRows} filas válidas
            {validation.valid ? ' — listo para importar' : ' — corrija errores antes de importar'}
          </p>
          {validation.errors.length > 0 && (
            <table className="data-table">
              <thead>
                <tr><th>Fila</th><th>Campo</th><th>Error</th></tr>
              </thead>
              <tbody>
                {validation.errors.map((err, i) => (
                  <tr key={i}>
                    <td>{err.row}</td>
                    <td>{err.field}</td>
                    <td>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {importResult && (
        <div className="panel">
          <h3>Resultado de importación</h3>
          <pre className="code-block">{JSON.stringify(importResult, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
