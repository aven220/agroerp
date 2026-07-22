import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PageHeader } from '../page/PageHeader';
import { PageLayout } from '../layout/PageLayout';
import { PageSection } from '../page/PageSection';
import { PageSummary, MetricCard } from '../page/PageSummary';
import { EmptyPanel } from '../page/PageState';

export interface LandingMetric {
  label: string;
  value: string | number;
  tone?: 'default' | 'coffee' | 'teal' | 'green';
  hint?: string;
}

export interface LandingModule {
  id: string;
  title: string;
  description: string;
  to: string;
  icon: string;
  badge?: string | number;
}

export interface LandingAction {
  label: string;
  to: string;
  primary?: boolean;
}

export interface LandingActivityItem {
  id: string;
  label: string;
  meta?: string;
  to?: string;
}

interface DomainLandingProps {
  title: string;
  subtitle: string;
  description?: string;
  metrics: LandingMetric[];
  modules: LandingModule[];
  quickActions?: LandingAction[];
  pending?: LandingActivityItem[];
  activity?: LandingActivityItem[];
  pendingTitle?: string;
  activityTitle?: string;
  modulesTitle?: string;
  children?: ReactNode;
}

/**
 * PM-43 — Landing de dominio: KPIs + módulos + acciones.
 * Sin tablas; el proceso (grids) vive en rutas hijas.
 */
export function DomainLanding({
  title,
  subtitle,
  description,
  metrics,
  modules,
  quickActions = [],
  pending = [],
  activity = [],
  pendingTitle = 'Pendientes',
  activityTitle = 'Actividad reciente',
  modulesTitle = 'Módulos del dominio',
  children,
}: DomainLandingProps) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        description={description}
        showExperience={false}
        actions={
          quickActions.length > 0 ? (
            <div className="edl-actions">
              {quickActions.map((a) => (
                <Link
                  key={a.to + a.label}
                  to={a.to}
                  className={`btn${a.primary ? ' btn-primary' : ''}`}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />
      <PageLayout>
        {metrics.length > 0 ? (
          <PageSummary>
            {metrics.map((m) => (
              <MetricCard
                key={m.label}
                label={m.label}
                value={m.value}
                tone={m.tone}
                hint={m.hint}
              />
            ))}
          </PageSummary>
        ) : null}

        <PageSection title={modulesTitle}>
          <div className="edl-module-grid">
            {modules.map((mod) => (
              <Link key={mod.id} to={mod.to} className="edl-module-card">
                <span className="edl-module-icon" aria-hidden>
                  {mod.icon}
                </span>
                <span className="edl-module-title">
                  {mod.title}
                  {mod.badge != null && mod.badge !== '' ? (
                    <span className="edl-module-badge">{mod.badge}</span>
                  ) : null}
                </span>
                <span className="edl-module-desc">{mod.description}</span>
              </Link>
            ))}
          </div>
        </PageSection>

        <div className="edl-split">
          <PageSection title={pendingTitle}>
            {pending.length === 0 ? (
              <EmptyPanel
                title="Sin pendientes"
                description="No hay ítems que requieran su atención en este momento."
              />
            ) : (
              <ul className="edl-list">
                {pending.map((p) => (
                  <li key={p.id}>
                    {p.to ? (
                      <Link to={p.to}>
                        <strong>{p.label}</strong>
                        {p.meta ? <span className="muted">{p.meta}</span> : null}
                      </Link>
                    ) : (
                      <>
                        <strong>{p.label}</strong>
                        {p.meta ? <span className="muted">{p.meta}</span> : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PageSection>

          <PageSection title={activityTitle}>
            {activity.length === 0 ? (
              <EmptyPanel
                title="Sin actividad reciente"
                description="Cuando haya movimientos en este dominio, aparecerán aquí."
              />
            ) : (
              <ul className="edl-list">
                {activity.map((a) => (
                  <li key={a.id}>
                    {a.to ? (
                      <Link to={a.to}>
                        <strong>{a.label}</strong>
                        {a.meta ? <span className="muted">{a.meta}</span> : null}
                      </Link>
                    ) : (
                      <>
                        <strong>{a.label}</strong>
                        {a.meta ? <span className="muted">{a.meta}</span> : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PageSection>
        </div>

        {children}
      </PageLayout>
    </>
  );
}
