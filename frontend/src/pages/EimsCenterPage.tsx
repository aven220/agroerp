import { useEffect, useState } from 'react';
import { DomainLanding } from '../components/landing/DomainLanding';
import { LoadingState } from '../components/ux/LoadingState';
import { PageState } from '../components/page';
import { getEimsCenter, listEimsMovements, listEimsOpsAlerts, listEimsReservations } from '../api/eims';
import { useOnEntityUpdated } from '../lib/entitySync';
import { humanizeCopy } from '../lib/humanizeCopy';

/**
 * PM-43 — Centro de Inventario (landing). Sin tablas al iniciar.
 */
export function EimsCenterPage() {
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [movements, setMovements] = useState<Array<Record<string, unknown>>>([]);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [reservations, setReservations] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => {
    getEimsCenter()
      .then(setCenter)
      .catch((e: Error) => setError(e.message));
    listEimsMovements({})
      .then((m) => setMovements((Array.isArray(m) ? m : []).slice(0, 8) as Array<Record<string, unknown>>))
      .catch(() => setMovements([]));
    listEimsOpsAlerts()
      .then((a) => setAlerts((Array.isArray(a) ? a : []).slice(0, 8) as Array<Record<string, unknown>>))
      .catch(() => setAlerts([]));
    listEimsReservations({})
      .then((r) => setReservations((Array.isArray(r) ? r : []).slice(0, 8) as Array<Record<string, unknown>>))
      .catch(() => setReservations([]));
  };

  useEffect(() => {
    reload();
  }, []);

  useOnEntityUpdated(() => reload(), ['inventory']);

  if (!center && !error) return <LoadingState variant="page" message="Cargando centro de inventario…" />;
  if (error && !center) {
    return (
      <DomainLanding
        title="Centro de Inventario"
        subtitle="Existencias, movimientos y bodegas"
        metrics={[]}
        modules={[]}
      >
        <PageState variant="error" message={error} />
      </DomainLanding>
    );
  }

  const entries = movements.filter((m) => {
    const t = String(m.movementType ?? m.type ?? '').toLowerCase();
    return t.includes('in') || t.includes('entr');
  }).length;
  const exits = Math.max(0, movements.length - entries);

  return (
    <DomainLanding
      title="Centro de Inventario"
      subtitle="Existencias, movimientos, alertas y bodegas"
      description="Resumen del dominio. Las tablas de detalle se abren en cada proceso."
      metrics={[
        { label: 'Bodegas', value: String(center?.warehousesCount ?? 0), tone: 'teal' },
        { label: 'Artículos', value: String(center?.itemsCount ?? 0) },
        { label: 'Reservas', value: String(center?.activeReservations ?? reservations.length) },
        { label: 'Alertas', value: String(center?.openOpsAlerts ?? alerts.length), tone: 'coffee' },
        { label: 'Movimientos (muestra)', value: movements.length },
        { label: 'Conteos abiertos', value: String(center?.countsOpen ?? 0) },
      ]}
      quickActions={[
        { label: 'Nuevo movimiento', to: '/inventario/movimientos', primary: true },
        { label: 'Ver bodegas', to: '/inventario/bodegas' },
      ]}
      modules={[
        { id: 'ex', title: 'Existencias', description: 'Stock por artículo y bodega', to: '/inventario/articulos', icon: '📦' },
        { id: 'mov', title: 'Movimientos', description: 'Entradas, salidas y transferencias', to: '/inventario/movimientos', icon: '🔄', badge: movements.length || undefined },
        { id: 'ent', title: 'Entradas', description: 'Ingresos a bodega', to: '/inventario/movimientos', icon: '⬇️', badge: entries || undefined },
        { id: 'sal', title: 'Salidas', description: 'Egresos de bodega', to: '/inventario/movimientos', icon: '⬆️', badge: exits || undefined },
        { id: 'al', title: 'Alertas', description: 'Operación y reposición', to: '/inventario/ops', icon: '🔔', badge: alerts.length || undefined },
        { id: 'res', title: 'Reservas', description: 'Stock comprometido', to: '/inventario/reservas', icon: '🔖', badge: reservations.length || undefined },
        { id: 'bod', title: 'Bodegas', description: 'Sucursales y ubicaciones', to: '/inventario/bodegas', icon: '🏭' },
      ]}
      pending={[
        ...(Number(center?.countsOpen ?? 0) > 0
          ? [{ id: 'c', label: 'Conteos abiertos', meta: String(center?.countsOpen), to: '/inventario/conteos' }]
          : []),
        ...(alerts.length
          ? [{ id: 'a', label: 'Alertas de inventario', meta: String(alerts.length), to: '/inventario/ops' }]
          : []),
        ...(reservations.length
          ? [{ id: 'r', label: 'Reservas activas', meta: String(reservations.length), to: '/inventario/reservas' }]
          : []),
      ]}
      activity={movements.slice(0, 6).map((m, i) => ({
        id: String(m.id ?? m.movementKey ?? i),
        label: humanizeCopy(String(m.movementType ?? m.type ?? 'Movimiento')),
        meta: String(m.itemKey ?? m.itemName ?? ''),
        to: '/inventario/movimientos',
      }))}
    />
  );
}
