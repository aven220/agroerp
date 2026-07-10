import { useEffect, useState } from 'react';
import { HubToolbar } from '../components/layout/HubToolbar';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageSummary,
  MetricCard,
  PageState,
} from '../components/page';
import { getCoffeeConfigCenter, seedCoffeeConfig } from '../api/coffee';

export function CoffeeConfigCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const reload = () =>
    getCoffeeConfigCenter()
      .then(setDash)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración'));

  useEffect(() => {
    reload();
  }, []);

  if (!dash && !error) {
    return <PageState variant="loading" loadingVariant="dashboard" message="Cargando configuración…" />;
  }

  const catalogCounts = (dash?.catalogCounts ?? {}) as Record<string, unknown>;
  const filteredCounts = Object.entries(catalogCounts).filter(([key]) => {
    if (!search.trim()) return true;
    return key.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <PageHeader
        title="Centro de configuración — Compras café"
        subtitle="Catálogos, parámetros y reglas de recepción"
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Catálogos', to: '/compras/config/catalogos' }}
            searchPlaceholder="Buscar catálogo…"
            searchValue={search}
            onSearchChange={setSearch}
            moreActions={[
              {
                label: 'Cargar configuración inicial',
                onClick: () => seedCoffeeConfig().then(reload).catch((e) => setError(e.message)),
              },
              { label: 'Parámetros', to: '/compras/config/parametros' },
              { label: 'Precios', to: '/compras/config/precios' },
              { label: 'Centros', to: '/compras/config/centros' },
              { label: 'Validaciones', to: '/compras/config/validaciones' },
              { label: 'Historial', to: '/compras/config/cambios' },
              { label: 'Compras', to: '/compras' },
            ]}
          />
        }
      >
        {error ? <PageState variant="error" message={error} /> : null}

        {dash ? (
          <PageSummary>
            <MetricCard label="Catálogos" value={String(dash.totalCatalogEntries)} tone="blue" />
            <MetricCard label="Activos" value={String(dash.activeCatalogEntries)} tone="green" />
            <MetricCard label="Parámetros" value={String(dash.parameters)} />
            <MetricCard label="Reglas recepción" value={String(dash.receptionRules)} />
            <MetricCard label="Centros compra" value={String(dash.purchaseCenters)} tone="teal" />
            <MetricCard label="Precios" value={String(dash.priceConfigs)} tone="coffee" />
          </PageSummary>
        ) : null}

        <PageSection title="Conteo por catálogo">
          {filteredCounts.length === 0 ? (
            <PageState
              variant="empty"
              title="Sin catálogos"
              message="No hay conteos que coincidan con la búsqueda."
              loadingVariant="inline"
            />
          ) : (
            <pre className="code-block">{JSON.stringify(Object.fromEntries(filteredCounts), null, 2)}</pre>
          )}
        </PageSection>
      </PageLayout>
    </>
  );
}
