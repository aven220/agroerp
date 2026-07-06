import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEneacTimeline } from '../api/eneac';
import { LoadingState } from '../components/ux/LoadingState';

export function EventsTimelinePage() {
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof getEneacTimeline>> | null>(null);
  const [eventType, setEventType] = useState('');

  useEffect(() => {
    getEneacTimeline(undefined, undefined, eventType || undefined).then(setTimeline);
  }, [eventType]);

  if (!timeline) return <LoadingState variant="page" message="Cargando timeline..." />;

  return (
    <>
      <Header
        title="Centro de eventos"
        subtitle="Timeline unificado de dominio y notificaciones"
        actions={
          <div className="row-actions">
            <Link to="/notificaciones" className="btn">Bandeja</Link>
            <Link to="/notificaciones/dashboard" className="btn">Dashboard</Link>
          </div>
        }
      />

      <div className="filter-bar">
        <input
          placeholder="Filtrar por tipo de evento"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        />
      </div>

      <div className="split-layout">
        <section className="panel">
          <h3>Eventos de dominio</h3>
          <div className="timeline">
            {timeline.domainEvents.map((e) => {
              const ev = e as { id: string; eventType: string; occurredAt: string; aggregateType: string };
              return (
              <div key={ev.id} className="timeline-item">
                <time>{new Date(ev.occurredAt).toLocaleString()}</time>
                <strong>{ev.eventType}</strong>
                <span className="text-muted"> · {ev.aggregateType}</span>
              </div>
            );})}
          </div>
        </section>
        <section className="panel">
          <h3>Notificaciones generadas</h3>
          <div className="timeline">
            {timeline.notifications.map((n) => (
              <div key={n.id} className="timeline-item">
                <time>{new Date(n.createdAt).toLocaleString()}</time>
                <strong>{n.title}</strong>
                <span className={`badge badge-${n.alertSeverity}`}>{n.alertSeverity}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
