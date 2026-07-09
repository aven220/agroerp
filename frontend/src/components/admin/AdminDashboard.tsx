import { Link } from 'react-router-dom';
import type { Role, SystemUser } from '../../types';
import { computeAdminSetup } from '../../lib/adminSetupStatus';
import { ContextHelp } from './ContextHelp';

interface AdminDashboardProps {
  roles: Role[];
  users: SystemUser[];
  canCreateRole: boolean;
  canCreateUser: boolean;
  onCreateRole: () => void;
  onCreateUser: () => void;
  onViewRoles: () => void;
  onViewUsers: () => void;
  onChecklistAction: (action: 'createRole' | 'createUser' | 'viewRoles') => void;
}

export function AdminDashboard({
  roles,
  users,
  canCreateRole,
  canCreateUser,
  onCreateRole,
  onCreateUser,
  onViewRoles,
  onViewUsers,
  onChecklistAction,
}: AdminDashboardProps) {
  const setup = computeAdminSetup(roles, users);
  const noRoles = roles.length === 0;
  const noUsers = users.length === 0;

  function handleNextAction() {
    const { nextAction } = setup;
    if (nextAction.action === 'createRole') onCreateRole();
    else if (nextAction.action === 'createUser') onCreateUser();
    else if (nextAction.action === 'viewRoles') onViewRoles();
  }

  function renderChecklistItem(item: (typeof setup.checklist)[number]) {
    const content = (
      <>
        <span className={`admin-checklist-mark${item.done ? ' admin-checklist-mark--done' : ''}`}>
          {item.done ? '✓' : '□'}
        </span>
        <span className="admin-checklist-body">
          <strong>{item.label}</strong>
          <span className="muted">{item.detail}</span>
        </span>
      </>
    );

    if (item.done && item.to) {
      return (
        <Link key={item.id} to={item.to} className="admin-checklist-item admin-checklist-item--link">
          {content}
        </Link>
      );
    }
    if (!item.done && item.to) {
      return (
        <Link key={item.id} to={item.to} className="admin-checklist-item admin-checklist-item--pending">
          {content}
        </Link>
      );
    }
    if (!item.done && item.action) {
      return (
        <button
          key={item.id}
          type="button"
          className="admin-checklist-item admin-checklist-item--pending"
          onClick={() => onChecklistAction(item.action!)}
        >
          {content}
        </button>
      );
    }
    return (
      <div key={item.id} className={`admin-checklist-item${item.done ? ' admin-checklist-item--done' : ''}`}>
        {content}
      </div>
    );
  }

  return (
    <section className="admin-dashboard" aria-label="Centro de configuración">
      <article className="admin-dashboard-hero">
        <div className="admin-dashboard-hero-text">
          <h2>
            Organización
            <ContextHelp topic="organization" />
          </h2>
          <p className="muted">¿Dónde está y qué falta por configurar?</p>
        </div>
        <div className="admin-org-progress">
          <div
            className="admin-org-progress-bar"
            role="progressbar"
            aria-valuenow={setup.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Organización ${setup.progressPercent}% configurada`}
          >
            <span
              className="admin-org-progress-fill"
              style={{ width: `${setup.progressPercent}%` }}
            />
          </div>
          <div className="admin-org-progress-meta">
            <strong>{setup.progressPercent}% configurada</strong>
            <span className="muted">{setup.progressLabel}</span>
          </div>
        </div>
      </article>

      <article className="admin-next-action-card">
        <div>
          <p className="admin-next-action-eyebrow">¿Qué debo hacer ahora?</p>
          <strong>{setup.nextAction.label}</strong>
          <p className="muted">{setup.nextAction.description}</p>
        </div>
        {setup.nextAction.to ? (
          <Link to={setup.nextAction.to} className="btn btn-primary">
            Ir ahora →
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleNextAction}>
            Comenzar →
          </button>
        )}
      </article>

      {setup.singleAdminWarning ? (
        <div className="admin-recommendation" role="status">
          <span className="admin-recommendation-icon" aria-hidden>
            💡
          </span>
          <div>
            <strong>Recomendación de seguridad</strong>
            <p>
              Se recomienda crear al menos otro administrador para evitar pérdida de acceso.
            </p>
          </div>
          {canCreateUser ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={onCreateUser}>
              Crear administrador
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="admin-dashboard-grid">
        <article className="admin-dashboard-card">
          <header className="admin-dashboard-card-head">
            <h2>Checklist de configuración</h2>
            <p className="muted">Cada elemento abre directamente su pantalla</p>
          </header>
          <div className="admin-checklist">
            {setup.checklist.map(renderChecklistItem)}
          </div>
          {setup.pendingItems.length > 0 ? (
            <footer className="admin-checklist-footer">
              <p className="muted">
                Faltan: {setup.pendingItems.map((p) => p.label).join(', ')}
              </p>
            </footer>
          ) : null}
        </article>

        <article className="admin-dashboard-card">
          <header className="admin-dashboard-card-head">
            <h2>Ayuda rápida</h2>
            <p className="muted">Conceptos clave sin salir del sistema</p>
          </header>
          <ul className="admin-help-topics">
            <li>
              <ContextHelp topic="role" label="¿Qué es un Rol?" /> ¿Qué es un Rol?
            </li>
            <li>
              <ContextHelp topic="permission" label="¿Qué es un Permiso?" /> ¿Qué es un Permiso?
            </li>
            <li>
              <ContextHelp topic="mfa" label="¿Qué es MFA?" /> ¿Qué es MFA?
            </li>
            <li>
              <ContextHelp topic="audit" label="¿Qué es Auditoría?" /> ¿Qué es Auditoría?
            </li>
            <li>
              <ContextHelp topic="policy" label="¿Qué es una Política?" /> ¿Qué es una Política?
            </li>
            <li>
              <ContextHelp topic="user" label="¿Qué es un Usuario?" /> ¿Qué es un Usuario?
            </li>
          </ul>
        </article>
      </div>

      <article className="admin-dashboard-card admin-dashboard-card--actions">
        <header className="admin-dashboard-card-head">
          <h2>Acciones rápidas</h2>
        </header>
        <div className="admin-quick-actions">
          {canCreateRole ? (
            <button
              type="button"
              className="admin-quick-action admin-quick-action--primary"
              onClick={onCreateRole}
            >
              <span className="admin-quick-action-icon" aria-hidden>
                {noRoles ? '🎯' : '🔐'}
              </span>
              <span>
                <strong>{noRoles ? 'Crear primer rol' : 'Crear rol'}</strong>
                <span className="muted">Defina perfiles de acceso</span>
              </span>
            </button>
          ) : null}
          {canCreateUser ? (
            <button type="button" className="admin-quick-action" onClick={onCreateUser}>
              <span className="admin-quick-action-icon" aria-hidden>
                👤
              </span>
              <span>
                <strong>{noUsers ? 'Crear usuario' : 'Invitar usuario'}</strong>
                <span className="muted">Asigne acceso al equipo</span>
              </span>
            </button>
          ) : null}
          <button type="button" className="admin-quick-action" onClick={onViewRoles}>
            <span className="admin-quick-action-icon" aria-hidden>⚙️</span>
            <span>
              <strong>Configurar permisos</strong>
              <span className="muted">Revise roles existentes</span>
            </span>
          </button>
          <Link to="/iam/politicas" className="admin-quick-action">
            <span className="admin-quick-action-icon" aria-hidden>🛡️</span>
            <span>
              <strong>Políticas</strong>
              <span className="muted">MFA, contraseñas y sesiones</span>
            </span>
          </Link>
          <Link to="/iam/auditoria" className="admin-quick-action">
            <span className="admin-quick-action-icon" aria-hidden>📋</span>
            <span>
              <strong>Auditoría</strong>
              <span className="muted">Historial de accesos</span>
            </span>
          </Link>
          <button type="button" className="admin-quick-action" onClick={onViewUsers}>
            <span className="admin-quick-action-icon" aria-hidden>📊</span>
            <span>
              <strong>Ver usuarios</strong>
              <span className="muted">Listado de cuentas</span>
            </span>
          </button>
        </div>
      </article>
    </section>
  );
}
