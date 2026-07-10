import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection, PageSummary, MetricCard, EmptyPanel } from '../components/page';
import { LoadingState } from '../components/ux/LoadingState';
import { getCoffeeCenter, type CoffeeTicket } from '../api/coffee';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { labelTicketStatus, nextActionForTicket } from '../lib/productLabels';

/**
 * PM-25 — Enterprise Operation Center · Mi día
 * Agrega colas existentes; no crea lógica de negocio nueva.
 */
export function OperationCenterPage() {
  const { user } = useAuth();
  const { navHistory } = useNavigation();
  const [dash, setDash] = useState<Awaited<ReturnType<typeof getCoffeeCenter>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCoffeeCenter()
      .then(setDash)
      .catch((e: Error) => setError(e.message));
  }, []);

  const queue = useMemo(() => (dash?.queue ?? []).slice(0, 8), [dash]);
  const pending = useMemo(() => {
    const items: Array<{ label: string; count: number; to: string }> = [];
    if (dash) {
      if (dash.queueLength > 0) {
        items.push({ label: 'En cola de recepción / pesaje', count: dash.queueLength, to: '/compras/pesaje' });
      }
      const qualityPending = Math.max(0, (dash.weighedToday ?? 0) - (dash.qualityToday ?? 0));
      if (qualityPending > 0) {
        items.push({ label: 'Pendientes de calidad', count: qualityPending, to: '/compras/calidad' });
      }
      const settlePending = Math.max(0, (dash.qualityToday ?? 0) - (dash.settlementsToday ?? 0));
      if (settlePending > 0) {
        items.push({ label: 'Pendientes de liquidación', count: settlePending, to: '/compras/liquidaciones' });
      }
    }
    return items;
  }, [dash]);

  const recommended = useMemo(() => {
    if (!dash) return { label: 'Registrar recepción', to: '/compras/recepcion' };
    if (dash.queueLength > 0) return { label: 'Atender cola de pesaje', to: '/compras/pesaje' };
    if ((dash.weighedToday ?? 0) > (dash.qualityToday ?? 0)) {
      return { label: 'Continuar con calidad', to: '/compras/calidad' };
    }
    if ((dash.qualityToday ?? 0) > (dash.settlementsToday ?? 0)) {
      return { label: 'Generar liquidaciones', to: '/compras/liquidaciones' };
    }
    return { label: 'Registrar nueva recepción', to: '/compras/recepcion' };
  }, [dash]);

  if (!dash && !error) {
    return <LoadingState variant="page" message="Cargando su día de operación…" />;
  }

  const firstName = user?.firstName ?? 'equipo';

  return (
    <>
      <Header
        title="Mi día"
        subtitle={`Centro de Operación · Hola, ${firstName}`}
        description="Pendientes, cola de trabajo y próxima acción recomendada."
        showExperience={false}
      />
      <PageLayout
        toolbar={
          <div className="row-actions">
            <Link to={recommended.to} className="btn btn-primary">
              {recommended.label}
            </Link>
            <Link to="/compras/recepcion" className="btn">
              Nueva recepción
            </Link>
            <Link to="/productores" className="btn btn-ghost">
              Buscar productor
            </Link>
          </div>
        }
      >
        {error ? <section className="panel error-panel">{error}</section> : null}

        <PageSection title="Próxima acción recomendada">
          <div className="eoc-next-action">
            <p>
              Siguiente paso sugerido: <strong>{recommended.label}</strong>
            </p>
            <Link to={recommended.to} className="btn btn-primary">
              Continuar
            </Link>
          </div>
        </PageSection>

        <PageSummary>
          <MetricCard label="Tickets hoy" value={dash?.ticketsToday ?? 0} tone="coffee" />
          <MetricCard label="En cola" value={dash?.queueLength ?? 0} />
          <MetricCard label="Pesados" value={dash?.weighedToday ?? 0} />
          <MetricCard label="Calidad" value={dash?.qualityToday ?? 0} tone="green" />
          <MetricCard label="Liquidaciones" value={dash?.settlementsToday ?? 0} />
          <MetricCard label="Kg hoy" value={(dash?.kgToday ?? 0).toFixed(0)} tone="teal" />
        </PageSummary>

        <div className="eoc-grid">
          <PageSection title="Mis pendientes">
            {pending.length === 0 ? (
              <EmptyPanel title="Todo al día" description="No hay pendientes operativos en este momento." />
            ) : (
              <ul className="eoc-list">
                {pending.map((p) => (
                  <li key={p.to}>
                    <Link to={p.to}>
                      <strong>{p.count}</strong> {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title="Cola de trabajo">
            {queue.length === 0 ? (
              <EmptyPanel title="Cola vacía" description="No hay tickets en cola. Puede registrar una recepción." />
            ) : (
              <table className="data-table data-table-compact">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Productor</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((t: CoffeeTicket) => {
                    const next = nextActionForTicket(t.status);
                    return (
                      <tr key={t.id ?? t.ticketKey}>
                        <td>{t.ticketKey}</td>
                        <td>{t.producerName ?? '—'}</td>
                        <td>{labelTicketStatus(t.status)}</td>
                        <td>
                          {next ? (
                            <Link to={`${next.to}?ticket=${encodeURIComponent(t.ticketKey)}`}>{next.label}</Link>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </PageSection>

          <PageSection title="Actividad reciente">
            {navHistory.length === 0 ? (
              <EmptyPanel title="Sin actividad" description="Las pantallas que visite aparecerán aquí." />
            ) : (
              <ul className="eoc-list">
                {navHistory.slice(0, 6).map((h) => (
                  <li key={h.id}>
                    <Link to={h.to}>
                      <span aria-hidden>{h.icon}</span> {h.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>
      </PageLayout>
    </>
  );
}
