import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { exportGeoData, importGeoData } from '../api/gis';

export function GisImportPage() {
  const [format, setFormat] = useState('geojson');
  const [layerCode, setLayerCode] = useState('');
  const [content, setContent] = useState('');
  const [exportLayer, setExportLayer] = useState('');
  const [exportFormat, setExportFormat] = useState('geojson');
  const [result, setResult] = useState('');

  const onImport = async (e: FormEvent) => {
    e.preventDefault();
    setResult('');
    try {
      const r = await importGeoData({ format, layerCode, content });
      setResult(`Importados ${r.featureCount} features (id: ${r.importId})`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error de importación');
    }
  };

  const onExport = async () => {
    setResult('');
    try {
      const r = await exportGeoData({ format: exportFormat, layerCode: exportLayer || undefined });
      if (exportFormat === 'pdf') {
        const w = window.open('', '_blank');
        w?.document.write(r.content);
      } else {
        const blob = new Blob([r.content], { type: r.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export.${exportFormat}`;
        a.click();
      }
      setResult(`Exportados (${r.format})`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error de exportación');
    }
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setContent(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  return (
    <>
      <Header
        title="Importación / Exportación GIS"
        subtitle="GeoJSON, KML, GPX, CSV, Excel, Shapefile, PDF"
        actions={<Link to="/gis" className="btn">Mapa</Link>}
      />

      {result && <div className="alert">{result}</div>}

      <div className="panel-grid">
        <form className="panel form-grid" onSubmit={onImport}>
          <h3>Importar</h3>
          <label>
            Formato
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="geojson">GeoJSON</option>
              <option value="kml">KML</option>
              <option value="kmz">KMZ</option>
              <option value="gpx">GPX</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel (JSON)</option>
              <option value="shapefile">Shapefile (GeoJSON)</option>
            </select>
          </label>
          <label>
            Código de capa
            <input value={layerCode} onChange={(e) => setLayerCode(e.target.value)} required />
          </label>
          <label>
            Archivo
            <input type="file" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>
          <label>
            Contenido
            <textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">Importar</button>
        </form>

        <div className="panel form-grid">
          <h3>Exportar</h3>
          <label>
            Capa (opcional)
            <input value={exportLayer} onChange={(e) => setExportLayer(e.target.value)} />
          </label>
          <label>
            Formato
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="geojson">GeoJSON</option>
              <option value="kml">KML</option>
              <option value="csv">CSV</option>
              <option value="gpx">GPX</option>
              <option value="pdf">PDF (HTML)</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={onExport}>Exportar</button>
        </div>
      </div>
    </>
  );
}
