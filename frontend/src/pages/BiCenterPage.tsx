import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HubToolbar } from '../components/layout/HubToolbar';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageSummary,
  MetricCard,
  PageState,
} from '../components/page';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { getBiCenter, getBiRealtime, type BiCenter } from '../api/bi';
import { useIsMounted } from '../hooks/useIsMounted';
import { useOnEntityUpdated } from '../lib/entitySync';

export function BiCenterPage() {
  const mounted = useIsMounted();
  const [center, setCenter] = useState<BiCenter | null>(null);
  const [realtime, setRealtime] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getBiCenter()
      .then((c) => {
        if (mounted.current) {
          setCenter(c);
          setError(null);
        }
      })
      .catch((e) => {
        if (mounted.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar los reportes');
      });
    getBiRealtime().then((r) => {
      if (mounted.current) setRealtime(r);
    });
    const iv = setInterval(() => {
      getBiRealtime()
        .then((r) => {
          if (mounted.current) setRealtime(r);
        })
        .catch(() => undefined);
    }, 30000);
    return () => clearInterval(iv);
  }, [mounted]);

  useOnEntityUpdated(() => {
    getBiCenter()
      .then((c) => {
        if (mounted.current) setCenter(c);
      })
      .catch(() => undefined);
  }, ['producer', 'farm', 'lot', 'purchase', 'inventory']);

  if (!center && !error) {
    return <PageState variant="loading" loadingVariant="dashboard" message="Cargando reportes e indicadores…" />;
  }

  if (error && !center) {
    return (
      <>
        <PageHeader title="Reportes e indicadores" subtitle="Tableros, KPIs y análisis para la toma de decisiones" />
        <PageLayout>
          <PageState variant="error" message={error} />
        </PageLayout>
      </>
    );
  }

  if (!center) return null;

  const kpis = center.executive.kpis as Record<string, number> | undefined;
  const categories = Object.entries(center.categories).filter(([cat]) => {
    if (!search.trim()) return true;
    return cat.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <PageHeader
        title="Reportes e indicadores"
        subtitle="Tableros, KPIs y análisis para la toma de decisiones"
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Constructor', to: '/bi/disenar' }}
            searchPlaceholder="Buscar categoría…"
            searchValue={search}
            onSearchChange={setSearch}
            moreActions={[
              { label: 'Dashboards', to: '/bi/dashboards' },
              { label: 'Reportes', to: '/bi/reportes' },
              { label: 'KPIs', to: '/bi/kpis' },
              { label: 'Consultas', to: '/bi/consultas' },
            ]}
          />
        }
      >
        <FlowProgress flowId="reports" currentStepId="hub" />

        <FlowNextActions
          title="Recorrido de reportes"
          subtitle="Del tablero ejecutivo al detalle analítico."
          actions={[
            { label: 'Ver tableros', description: 'Indicadores visuales por área', to: '/bi/dashboards', primary: true, icon: '📈' },
            { label: 'Generar reporte', description: 'Exporte datos con filtros', to: '/bi/reportes', icon: '📄' },
            { label: 'Consulta avanzada', description: 'Cruce de datos personalizado', to: '/bi/consultas', icon: '🔍' },
          ]}
        />

        <PageSummary>
          <MetricCard label="Productores" value={String(kpis?.totalProducers ?? 0)} tone="blue" />
          <MetricCard label="Fincas" value={String(kpis?.totalFarms ?? 0)} />
          <MetricCard label="Lotes" value={String(kpis?.totalLots ?? 0)} />
          <MetricCard label="Procesos activos" value={String(kpis?.activeWorkflows ?? 0)} />
          <MetricCard label="Dashboards" value={String(center.dashboardCount)} tone="teal" />
          <MetricCard label="KPIs" value={String(center.kpiCount)} />
          <MetricCard label="Reportes" value={String(center.reportCount)} />
          <MetricCard label="Eventos 24h" value={String(kpis?.eventsLast24h ?? 0)} tone="coffee" />
        </PageSummary>

        {realtime ? (
          <PageSection title="Indicadores en tiempo real">
            <PageSummary>
              {Object.entries((realtime.indicators as Record<string, number>) ?? {}).map(([k, v]) => (
                <MetricCard key={k} label={k} value={String(v)} />
              ))}
            </PageSummary>
          </PageSection>
        ) : null}

        <PageSection title="Categorías">
          {categories.length === 0 ? (
            <PageState variant="empty" title="Sin categorías" message="No hay categorías que coincidan con la búsqueda." loadingVariant="inline" />
          ) : (
            <div className="bi-category-grid">
              {categories.map(([cat, count]) => (
                <Link key={cat} to={`/bi/dashboards?category=${cat}`} className="bi-category-card">
                  <strong>{cat}</strong>
                  <span>{count} dashboard{count !== 1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </PageSection>

        <PageSection title="IA — Preparación">
          <ul className="stat-list">
            {Object.entries(center.aiReadiness ?? {}).map(([k, v]) => (
              <li key={k}><span>{k}</span><strong>{v ? '✓' : '—'}</strong></li>
            ))}
          </ul>
        </PageSection>
      </PageLayout>
    </>
  );
}
