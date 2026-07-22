import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PageLayout, PageSection } from '../components/page';
import {
  CONSULTANT_JOURNEY,
  OPERATIONAL_JOURNEY,
  PRODUCT_ENTITIES,
} from '../lib/productConsistency';

const HELP_AREAS = [
  {
    title: 'Inicio',
    to: '/operacion',
    what: 'Ver qué debe hacer ahora: cola, atrasos, aprobaciones y alertas.',
    why: 'Es el punto de partida del ERP, no un tablero de módulos.',
    when: 'Al iniciar la jornada o cada vez que necesite priorizar trabajo.',
    after: 'Continúe a la acción recomendada (pesaje, calidad, liquidación o bandeja).',
  },
  {
    title: 'Reportes gerenciales',
    to: '/gerencia',
    what: 'Consultar KPIs, tendencias, riesgos y alertas.',
    why: 'La gerencia decide y supervisa; no registra recepciones ni liquidaciones.',
    when: 'Revisiones diarias o semanales de desempeño y riesgos.',
    after: 'Profundice a reportes o BI si necesita detalle.',
  },
  {
    title: 'Configuración',
    to: '/configuracion',
    what: 'Configurar empresa, usuarios, roles y numeraciones.',
    why: 'Un solo lugar para preparar el ERP sin módulos técnicos.',
    when: 'Durante la puesta en marcha o al ajustar accesos.',
    after: 'Complete la siguiente área y revise preparación / Go Live.',
  },
  {
    title: 'Compras',
    to: '/compras',
    what: 'Registrar y avanzar compras: recepción → pesaje → calidad → liquidación.',
    why: 'Es el flujo operativo principal de la cooperativa cafetera.',
    when: 'Cuando llega café o hay tickets en cola.',
    after: 'El ticket avanza de estado; Inicio refleja lo pendiente.',
  },
  {
    title: 'Procesos',
    to: '/procesos/bandeja',
    what: 'Atender trámites que esperan su decisión.',
    why: 'Evita cuellos de botella y atrasos en procesos de la organización.',
    when: 'Cuando Inicio muestre ítems por aprobar o vencidos.',
    after: 'El trámite continúa al siguiente paso o se cierra.',
  },
  {
    title: 'Notificaciones',
    to: '/notificaciones',
    what: 'Revisar avisos agrupados por operación, procesos e implementación.',
    why: 'Centraliza alertas sin mezclar contextos distintos.',
    when: 'Al recibir avisos o al cerrar el día.',
    after: 'Marque como leída, atienda o archive según corresponda.',
  },
];

/**
 * PM-28/30 — Ayuda por experiencia + recorridos validados.
 */
export function HelpCenterPage() {
  return (
    <>
      <Header
        title="Centro de ayuda"
        subtitle="Guía de uso del producto"
        description="Respuestas prácticas por pantalla y recorridos sin caminos muertos."
        showExperience={false}
      />
      <PageLayout>
        <PageSection title="Cómo orientarse">
          <p className="help-intro">
            Cada pantalla del ERP responde a un trabajo concreto. Use el selector de centro (Operación, Gerencia,
            Implementación) y la búsqueda global (⌘K) para encontrar productores, fincas, lotes y documentos — no solo
            menús.
          </p>
        </PageSection>

        <PageSection title="Recorrido del consultor">
          <ol className="eic-journey help-journey">
            {CONSULTANT_JOURNEY.map((step) => (
              <li key={step.path}>
                <Link to={step.path}>{step.label}</Link>
              </li>
            ))}
          </ol>
        </PageSection>

        <PageSection title="Recorrido operativo del día">
          <ol className="eic-journey help-journey">
            {OPERATIONAL_JOURNEY.map((step) => (
              <li key={step.path}>
                <Link to={step.path}>{step.label}</Link>
              </li>
            ))}
          </ol>
        </PageSection>

        <PageSection title="Entidades del producto (nombre e ícono únicos)">
          <ul className="eoc-list help-entity-list">
            {PRODUCT_ENTITIES.map((e) => (
              <li key={e.id}>
                <Link to={e.listPath}>
                  <span aria-hidden>{e.icon}</span> {e.label}
                </Link>
              </li>
            ))}
          </ul>
        </PageSection>

        <div className="help-grid">
          {HELP_AREAS.map((area) => (
            <article key={area.to} className="help-card">
              <header>
                <h3>{area.title}</h3>
                <Link to={area.to} className="btn btn-sm">
                  Abrir
                </Link>
              </header>
              <dl className="help-dl">
                <div>
                  <dt>¿Qué hago aquí?</dt>
                  <dd>{area.what}</dd>
                </div>
                <div>
                  <dt>¿Por qué existe?</dt>
                  <dd>{area.why}</dd>
                </div>
                <div>
                  <dt>¿Cuándo la uso?</dt>
                  <dd>{area.when}</dd>
                </div>
                <div>
                  <dt>¿Qué ocurre después?</dt>
                  <dd>{area.after}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </PageLayout>
    </>
  );
}
