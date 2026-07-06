import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonFeatureCollection, GisBasemap } from '../../api/gis';

export interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  basemap?: GisBasemap | null;
  features?: GeoJsonFeatureCollection | null;
  height?: string;
  onMapReady?: (map: L.Map) => void;
}

export function MapView({
  center = { lat: 6.2442, lng: -75.5812 },
  zoom = 10,
  basemap,
  features,
  height = '480px',
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([center.lat, center.lng], zoom);
    mapRef.current = map;
    onMapReady?.(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) {
      map.removeLayer(tileRef.current);
      tileRef.current = null;
    }
    const url =
      basemap?.urlTemplate ||
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    if (url) {
      const tile = L.tileLayer(url, {
        attribution: basemap?.attribution ?? '© OpenStreetMap',
        maxZoom: 19,
      });
      tile.addTo(map);
      tileRef.current = tile;
    }
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (features?.features?.length) {
      const geo = L.geoJSON(features as GeoJSON.FeatureCollection, {
        style: () => ({
          color: '#16a34a',
          weight: 2,
          fillOpacity: 0.25,
        }),
        pointToLayer: (_f, latlng) =>
          L.circleMarker(latlng, { radius: 6, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8 }),
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.name ?? feature.properties?.code;
          if (name) layer.bindPopup(String(name));
        },
      });
      geo.addTo(map);
      layerRef.current = geo;
      try {
        map.fitBounds(geo.getBounds(), { padding: [24, 24] });
      } catch {
        /* empty bounds */
      }
    }
  }, [features]);

  return <div ref={containerRef} className="gis-map-container" style={{ height, width: '100%' }} />;
}
