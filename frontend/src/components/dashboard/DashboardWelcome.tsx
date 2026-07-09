import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ROLE_LABELS } from '../../config/widgetRegistry';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DashboardWelcome() {
  const { user } = useAuth();
  const { dashboardRole } = useWorkspace();
  const now = new Date();
  const firstName = user?.firstName ?? 'usuario';
  const isReturning = Boolean(user?.lastLoginAt);
  const greeting = isReturning ? 'Bienvenido nuevamente' : greetingForHour(now.getHours());

  return (
    <section className="ws-welcome" aria-label="Bienvenida">
      <div className="ws-welcome-main">
        <p className="ws-welcome-greeting">{greeting}, {firstName}.</p>
        <h2 className="ws-welcome-title">Su centro de trabajo</h2>
        <p className="ws-welcome-sub">
          Organice su jornada: acciones prioritarias, pendientes y actividad reciente en un solo lugar.
        </p>
      </div>
      <dl className="ws-welcome-meta">
        <div>
          <dt>Rol</dt>
          <dd>{ROLE_LABELS[dashboardRole]}</dd>
        </div>
        <div>
          <dt>Organización</dt>
          <dd>{user?.organization.name ?? '—'}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd className="ws-welcome-date">{formatDate(now)}</dd>
        </div>
      </dl>
    </section>
  );
}
