import { useEffect, useState } from 'react';
import { DomainLanding } from '../components/landing/DomainLanding';
import { LoadingState } from '../components/ux/LoadingState';
import { getProducerDashboard, type ProducerDashboard } from '../api/prm';
import { listFarms } from '../api/ftip';
import { listLots } from '../api/fmdt';
import { useAuth } from '../context/AuthContext';
import { useOnEntityUpdated } from '../lib/entitySync';

/**
 * PM-43 — Centro de Productores (landing). Listado en /productores/lista.
 */
export function ProducersLandingPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('producer:create');
  const [dash, setDash] = useState<ProducerDashboard | null>(null);
  const [farmsTotal, setFarmsTotal] = useState(0);
  const [lotsTotal, setLotsTotal] = useState(0);

  const reload = () => {
    getProducerDashboard()
      .then(setDash)
      .catch(() => setDash(null));
    listFarms({ limit: 1 })
      .then((r) => setFarmsTotal(r.pagination?.total ?? r.items?.length ?? 0))
      .catch(() => setFarmsTotal(0));
    listLots({ limit: 1 })
      .then((r) => setLotsTotal(r.pagination?.total ?? r.items?.length ?? 0))
      .catch(() => setLotsTotal(0));
  };

  useEffect(() => {
    reload();
  }, []);

  useOnEntityUpdated(() => reload(), ['producer', 'farm', 'lot']);

  if (!dash) return <LoadingState variant="page" message="Cargando centro de productores…" />;

  const k = dash.kpis;

  return (
    <DomainLanding
      title="Centro de Productores"
      subtitle="Asociados, fincas y lotes"
      description="Vista de dominio. El listado completo se abre cuando lo necesite."
      metrics={[
        { label: 'Total productores', value: k.total, tone: 'coffee' },
        { label: 'Activos', value: k.active, tone: 'green' },
        { label: 'Pendientes', value: k.pendingApproval },
        { label: 'Nuevos (activaciones)', value: k.recentActivations, tone: 'teal' },
        { label: 'Fincas', value: farmsTotal },
        { label: 'Lotes', value: lotsTotal },
      ]}
      quickActions={[
        ...(canCreate ? [{ label: 'Nuevo productor', to: '/productores/nuevo', primary: true as const }] : []),
        { label: 'Ver listado', to: '/productores/lista' },
      ]}
      modules={[
        {
          id: 'list',
          title: 'Productores',
          description: 'Directorio y expediente',
          to: '/productores/lista',
          icon: '👤',
          badge: k.total || undefined,
        },
        {
          id: 'new',
          title: 'Altas',
          description: 'Registrar nuevo asociado',
          to: '/productores/nuevo',
          icon: '➕',
        },
        {
          id: 'pend',
          title: 'Pendientes de aprobación',
          description: 'En revisión',
          to: '/productores/lista',
          icon: '⏳',
          badge: k.pendingApproval || undefined,
        },
        { id: 'fincas', title: 'Fincas', description: 'Predios vinculados', to: '/fincas', icon: '🌿', badge: farmsTotal || undefined },
        { id: 'lotes', title: 'Lotes', description: 'Parcelas y trazabilidad', to: '/lotes', icon: '📍', badge: lotsTotal || undefined },
        { id: 'dash', title: 'Indicadores', description: 'Panel de productores', to: '/productores/dashboard', icon: '📊' },
      ]}
      pending={[
        ...(k.pendingApproval
          ? [{ id: 'p', label: 'Pendientes de aprobación', meta: String(k.pendingApproval), to: '/productores/lista' }]
          : []),
        ...(k.suspended
          ? [{ id: 's', label: 'Suspendidos', meta: String(k.suspended), to: '/productores/lista' }]
          : []),
        ...(k.expiringCertifications
          ? [{ id: 'c', label: 'Certificaciones por vencer', meta: String(k.expiringCertifications), to: '/productores/lista' }]
          : []),
      ]}
      activity={dash.byStatus.slice(0, 6).map((s) => ({
        id: s.status,
        label: s.status,
        meta: `${s.count} productores`,
        to: '/productores/lista',
      }))}
      activityTitle="Distribución por estado"
    />
  );
}
