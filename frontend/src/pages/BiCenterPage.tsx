import { useEffect, useState } from 'react';
import { DomainLanding } from '../components/landing/DomainLanding';
import { PageState } from '../components/page';
import { getBiCenter, getBiRealtime, type BiCenter } from '../api/bi';
import { getCoffeeCenter } from '../api/coffee';
import { useIsMounted } from '../hooks/useIsMounted';
import { useOnEntityUpdated } from '../lib/entitySync';

/**
 * PM-43 — Centro de Reportes (landing). Sin tablas; drill-down a reportes/BI.
 */
export function BiCenterPage() {
  const mounted = useIsMounted();
  const [center, setCenter] = useState<BiCenter | null>(null);
  const [realtime, setRealtime] = useState<Record<string, unknown> | null>(null);
  const [coffee, setCoffee] = useState<Awaited<ReturnType<typeof getCoffeeCenter>> | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    getCoffeeCenter()
      .then((c) => {
        if (mounted.current) setCoffee(c);
      })
      .catch(() => undefined);
  }, [mounted]);

  useOnEntityUpdated(() => {
    getBiCenter()
      .then((c) => {
        if (mounted.current) setCenter(c);
      })
      .catch(() => undefined);
    getCoffeeCenter()
      .then((c) => {
        if (mounted.current) setCoffee(c);
      })
      .catch(() => undefined);
  }, ['producer', 'farm', 'lot', 'purchase', 'inventory']);

  if (!center && !error) {
    return <PageState variant="loading" loadingVariant="dashboard" message="Cargando centro de reportes…" />;
  }

  if (error && !center) {
    return (
      <DomainLanding title="Reportes" subtitle="Indicadores por dominio" metrics={[]} modules={[]}>
        <PageState variant="error" message={error} />
      </DomainLanding>
    );
  }

  const kpis = center?.executive.kpis as Record<string, number> | undefined;

  return (
    <DomainLanding
      title="Reportes"
      subtitle="Operativos · Gerenciales · Auditoría · BI"
      description="Consulte indicadores e informes. La operación diaria está en Operación."
      metrics={[
        { label: 'Tickets hoy', value: coffee?.ticketsToday ?? kpis?.tickets ?? '—', tone: 'coffee' },
        { label: 'Kg hoy', value: coffee ? coffee.kgToday.toFixed(0) : '—' },
        { label: 'Liquidaciones', value: coffee?.settlementsToday ?? '—', tone: 'teal' },
        { label: 'Tiempo real', value: realtime ? 'Activo' : '—', hint: 'Señal BI' },
      ]}
      quickActions={[
        { label: 'Biblioteca BI', to: '/bi/reportes', primary: true },
        { label: 'Gerenciales', to: '/gerencia' },
      ]}
      modules={[
        { id: 'ops', title: 'Operativos', description: 'Compras e inventario del día', to: '/compras/ops/reportes', icon: '📋' },
        { id: 'ger', title: 'Gerenciales', description: 'KPIs y riesgos', to: '/gerencia', icon: '◈' },
        { id: 'aud', title: 'Auditoría', description: 'Accesos y trazas', to: '/iam/auditoria', icon: '🔍' },
        { id: 'bi', title: 'BI', description: 'Tableros y consultas', to: '/bi/dashboards', icon: '📈' },
      ]}
      pending={[
        { id: 'r1', label: 'Reportes de compras', to: '/compras/ops/reportes' },
        { id: 'r2', label: 'Tableros BI', to: '/bi/dashboards' },
      ]}
      activity={[
        { id: 'a1', label: 'Indicadores gerenciales', to: '/gerencia' },
        { id: 'a2', label: 'Consultas BI', to: '/bi/consultas' },
      ]}
      pendingTitle="Sugeridos"
      activityTitle="Accesos rápidos"
      modulesTitle="Tipos de reporte"
    />
  );
}
