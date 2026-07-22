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
      <DomainLanding title="Centro de Reportes" subtitle="Indicadores por dominio" metrics={[]} modules={[]}>
        <PageState variant="error" message={error} />
      </DomainLanding>
    );
  }

  const kpis = center?.executive.kpis as Record<string, number> | undefined;

  return (
    <DomainLanding
      title="Centro de Reportes"
      subtitle="Compras, inventario, productores, calidad y gerencia"
      description="Elija un dominio para profundizar. No hay grillas en esta pantalla."
      metrics={[
        { label: 'Tickets hoy', value: coffee?.ticketsToday ?? kpis?.tickets ?? '—', tone: 'coffee' },
        { label: 'Kg hoy', value: coffee ? coffee.kgToday.toFixed(0) : '—' },
        { label: 'Liquidaciones', value: coffee?.settlementsToday ?? '—', tone: 'teal' },
        { label: 'Tiempo real', value: realtime ? 'Activo' : '—', hint: 'Señal BI' },
      ]}
      quickActions={[
        { label: 'Biblioteca de reportes', to: '/bi/reportes', primary: true },
        { label: 'Dashboard ejecutivo', to: '/gerencia' },
      ]}
      modules={[
        { id: 'com', title: 'Compras', description: 'Operación y volumen del día', to: '/compras/ops', icon: '🛒' },
        { id: 'inv', title: 'Inventario', description: 'Stock y movimientos', to: '/inventario/ops', icon: '📦' },
        { id: 'pro', title: 'Productores', description: 'Base asociada', to: '/productores/dashboard', icon: '👤' },
        { id: 'cal', title: 'Calidad', description: 'Indicadores de muestra', to: '/compras/calidad/indicadores', icon: '✓' },
        { id: 'ger', title: 'Gerencia', description: 'Resumen ejecutivo', to: '/gerencia', icon: '◈' },
        { id: 'bi', title: 'BI / Tableros', description: 'Dashboards y consultas', to: '/bi/dashboards', icon: '📈' },
        { id: 'rep', title: 'Reportes', description: 'Informes guardados', to: '/bi/reportes', icon: '📋' },
      ]}
      pending={[
        { id: 'r1', label: 'Abrir reportes de compras', to: '/compras/ops/reportes' },
        { id: 'r2', label: 'Indicadores de calidad', to: '/compras/calidad/indicadores' },
      ]}
      activity={[
        { id: 'a1', label: 'KPIs ejecutivos', to: '/gerencia' },
        { id: 'a2', label: 'Consultas BI', to: '/bi/consultas' },
      ]}
      pendingTitle="Sugeridos"
      activityTitle="Accesos rápidos"
    />
  );
}
