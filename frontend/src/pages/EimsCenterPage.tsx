import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageLayout, PageSection, PageSummary, MetricCard } from '../components/page';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { getEimsCenter, seedEims } from '../api/eims';
import { LoadingState } from '../components/ux/LoadingState';

/**
 * PM-25 — Hub de inventario simplificado + terminología de producto.
 */
export function EimsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const reload = () => getEimsCenter().then(setCenter).catch((e) => setError(e.message));
  useEffect(() => {
    reload();
  }, []);

  if (!center && !error) return <LoadingState variant="page" message="Cargando inventario…" />;

  const warehouses = ((center?.warehouses as Array<Record<string, unknown>>) ?? []).filter((w) => {
    if (!search.trim()) return true;
    return String(w.name ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <Header
        title="Inventario"
        subtitle="Bodegas, artículos, movimientos y existencias"
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Nuevo movimiento', to: '/inventario/movimientos' }}
            searchPlaceholder="Buscar bodega…"
            searchValue={search}
            onSearchChange={setSearch}
            moreActions={[
              { label: 'Artículos', to: '/inventario/articulos' },
              { label: 'Bodegas', to: '/inventario/bodegas' },
              { label: 'Kardex', to: '/inventario/kardex' },
              { label: 'Conteos', to: '/inventario/conteos' },
              { label: 'Lotes', to: '/inventario/lotes' },
              { label: 'Parámetros', to: '/inventario/parametros' },
              {
                label: 'Cargar configuración inicial',
                onClick: () => seedEims().then(reload).catch((e) => setError(e.message)),
              },
            ]}
          />
        }
      >
        <FlowProgress flowId="inventory" currentStepId="hub" />
        <FlowNextActions
          title="Operación de inventario"
          subtitle="Siga el ciclo recomendado para mantener stock actualizado."
          actions={[
            { label: 'Registrar artículos', description: 'Primero defina qué productos controla', to: '/inventario/articulos', primary: true, icon: '📦' },
            { label: 'Configurar bodegas', description: 'Ubicaciones físicas de almacenamiento', to: '/inventario/bodegas', icon: '🏭' },
            { label: 'Registrar movimiento', description: 'Entradas, salidas y transferencias', to: '/inventario/movimientos', icon: '🔄' },
            { label: 'Consultar kardex', description: 'Historial de movimientos por artículo', to: '/inventario/kardex', icon: '📊' },
          ]}
        />

        {error ? <section className="panel error-panel">{error}</section> : null}

        {center ? (
          <>
            <PageSummary>
              <MetricCard label="Bodegas" value={String(center.warehousesCount ?? 0)} tone="teal" />
              <MetricCard label="Artículos" value={String(center.itemsCount ?? 0)} />
              <MetricCard label="Lotes" value={String(center.lotsCount ?? 0)} />
              <MetricCard label="Conteos abiertos" value={String(center.countsOpen ?? 0)} />
              <MetricCard label="Reservas activas" value={String(center.activeReservations ?? 0)} />
              <MetricCard label="Alertas" value={String(center.openOpsAlerts ?? center.alertsCount ?? 0)} tone="coffee" />
            </PageSummary>

            <PageSection title="Bodegas">
              <ul className="eoc-list">
                {warehouses.map((w) => (
                  <li key={String(w.warehouseKey)}>
                    {String(w.name)} ({String(w.warehouseType)})
                  </li>
                ))}
                {warehouses.length === 0 ? <li className="muted">No hay bodegas que coincidan.</li> : null}
              </ul>
            </PageSection>
          </>
        ) : null}
      </PageLayout>
    </>
  );
}
