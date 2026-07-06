import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { Header } from '../components/layout/Header';
import { MapView } from '../components/gis/MapView';
import {
  GisBasemap,
  GisLayer,
  GeoJsonFeatureCollection,
  getLayerFeatures,
  listBasemaps,
  listGisLayers,
  measureArea,
  measureDistance,
  refreshAllGisLayers,
} from '../api/gis';

export function GisMapPage() {
  const [layers, setLayers] = useState<GisLayer[]>([]);
  const [basemaps, setBasemaps] = useState<GisBasemap[]>([]);
  const [activeBasemap, setActiveBasemap] = useState<GisBasemap | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [features, setFeatures] = useState<GeoJsonFeatureCollection | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [measureMode, setMeasureMode] = useState<'none' | 'distance' | 'area'>('none');
  const [measurePoints, setMeasurePoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [measureResult, setMeasureResult] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [layerList, basemapList] = await Promise.all([listGisLayers('active'), listBasemaps()]);
      setLayers(layerList);
      setBasemaps(basemapList);
      const def = basemapList.find((b) => b.defaultForOrg) ?? basemapList[0] ?? null;
      setActiveBasemap(def);
      const vis: Record<string, boolean> = {};
      layerList.forEach((l) => {
        vis[l.id] = true;
      });
      setVisibleLayers(vis);
      await refreshAllGisLayers();
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFeatures = useCallback(async () => {
    if (!map) return;
    const bounds = map.getBounds();
    const bbox = {
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    };
    const active = layers.filter((l) => visibleLayers[l.id]);
    const collections: GeoJsonFeatureCollection['features'] = [];
    for (const layer of active) {
      try {
        const fc = await getLayerFeatures(layer.id, bbox);
        collections.push(
          ...fc.features.map((f) => ({
            ...f,
            properties: { ...f.properties, _layer: layer.layerName },
          })),
        );
      } catch {
        /* layer empty */
      }
    }
    setFeatures({ type: 'FeatureCollection', features: collections });
    setHistory((h) => [`Carga ${collections.length} features`, ...h].slice(0, 20));
  }, [map, layers, visibleLayers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!map) return;
    const handler = () => void loadFeatures();
    map.on('moveend', handler);
    void loadFeatures();
    return () => {
      map.off('moveend', handler);
    };
  }, [map, loadFeatures]);

  useEffect(() => {
    if (!map || measureMode === 'none') return;
    const onClick = (e: L.LeafletMouseEvent) => {
      setMeasurePoints((pts) => {
        const next = [...pts, { lat: e.latlng.lat, lng: e.latlng.lng }];
        if (measureMode === 'distance' && next.length === 2) {
          void measureDistance(next[0].lat, next[0].lng, next[1].lat, next[1].lng).then((r) => {
            setMeasureResult(`${(r.distanceM / 1000).toFixed(3)} km`);
          });
          return [];
        }
        if (measureMode === 'area' && next.length >= 3) {
          const ring = [...next, next[0]].map((p) => [p.lng, p.lat]);
          void measureArea({ type: 'Polygon', coordinates: [ring] }).then((r) => {
            setMeasureResult(`${r.areaHa} ha`);
          });
        }
        return next;
      });
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, measureMode]);

  return (
    <>
      <Header
        title="Centro de mapas"
        subtitle="EGSIP — Inteligencia espacial territorial"
        actions={
          <>
            <Link to="/gis/dashboard" className="btn">Dashboard</Link>
            <Link to="/gis/capas" className="btn">Capas</Link>
            <Link to="/gis/importar" className="btn">Importar</Link>
          </>
        }
      />

      <div className="gis-toolbar">
        <label>
          Mapa base
          <select
            value={activeBasemap?.id ?? ''}
            onChange={(e) => setActiveBasemap(basemaps.find((b) => b.id === e.target.value) ?? null)}
          >
            {basemaps.map((b) => (
              <option key={b.id} value={b.id}>{b.basemapName}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-sm" onClick={() => map?.zoomIn()}>Zoom +</button>
        <button type="button" className="btn btn-sm" onClick={() => map?.zoomOut()}>Zoom −</button>
        <button
          type="button"
          className={`btn btn-sm${measureMode === 'distance' ? ' btn-primary' : ''}`}
          onClick={() => { setMeasureMode('distance'); setMeasureResult(''); setMeasurePoints([]); }}
        >
          Distancia
        </button>
        <button
          type="button"
          className={`btn btn-sm${measureMode === 'area' ? ' btn-primary' : ''}`}
          onClick={() => { setMeasureMode('area'); setMeasureResult(''); setMeasurePoints([]); }}
        >
          Área
        </button>
        <button type="button" className="btn btn-sm" onClick={() => { setMeasureMode('none'); setMeasureResult(''); }}>
          Limpiar
        </button>
        {measureResult && <span className="gis-measure-result">{measureResult}</span>}
      </div>

      <div className="gis-layout">
        <aside className="gis-sidebar">
          <h3>Capas</h3>
          {loading && <p>Cargando...</p>}
          {layers.map((layer) => (
            <label key={layer.id} className="gis-layer-item">
              <input
                type="checkbox"
                checked={visibleLayers[layer.id] ?? false}
                onChange={(e) => {
                  setVisibleLayers((v) => ({ ...v, [layer.id]: e.target.checked }));
                  setTimeout(() => void loadFeatures(), 0);
                }}
              />
              {layer.layerName}
            </label>
          ))}
          <h3>Historial</h3>
          <ul className="gis-history">
            {history.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </aside>
        <div className="gis-map-panel">
          <MapView
            basemap={activeBasemap}
            features={features}
            height="calc(100vh - 220px)"
            onMapReady={setMap}
          />
        </div>
      </div>
    </>
  );
}
