import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEip,
  bridgeEipEvent,
  createEipBinding,
  createEipEsbRoute,
  createEipPolicy,
  createEipWebhook,
  getEipCenter,
  getEipConnectorCatalog,
  getEipGatewayAnalytics,
  getEipMessagingSlots,
  getEipMonitoringDashboard,
  listEipBindings,
  listEipBreRules,
  listEipConnectors,
  listEipDlq,
  listEipErrors,
  listEipEsbMessages,
  listEipEsbRoutes,
  listEipEventMessages,
  listEipEventTopics,
  listEipInvocations,
  listEipMessagingProviders,
  listEipPolicies,
  listEipWebhookHistory,
  listEipWebhooks,
  publishEipEvent,
  registerEipConnector,
  retryEipWebhooks,
  simulateEipRule,
  type EipCenter,
} from '../api/eip';

const EIP_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-empresarial/eip" className="btn">Centro</Link>
    <Link to="/plataforma-empresarial/eip/apis" className="btn">APIs</Link>
    <Link to="/plataforma-empresarial/eip/conectores" className="btn">Conectores</Link>
    <Link to="/plataforma-empresarial/eip/webhooks" className="btn">Webhooks</Link>
    <Link to="/plataforma-empresarial/eip/eventos" className="btn">Eventos</Link>
    <Link to="/plataforma-empresarial/eip/esb" className="btn">ESB</Link>
    <Link to="/plataforma-empresarial/eip/mensajeria" className="btn">Mensajería</Link>
    <Link to="/plataforma-empresarial/eip/rendimiento" className="btn">Rendimiento</Link>
    <Link to="/plataforma-empresarial/eip/errores" className="btn">Errores</Link>
    <Link to="/plataforma-empresarial/eip/reglas" className="btn">Reglas BRE</Link>
  </div>
);

export function EipCenterPage() {
  const [center, setCenter] = useState<EipCenter | null>(null);
  useEffect(() => { getEipCenter().then(setCenter); }, []);
  const dashboard = center?.dashboard as Record<string, number> | undefined;

  return (
    <>
      <Header title="Centro de Integraciones EIP" subtitle="Plataforma Enterprise — Sprint 2" actions={EIP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Invocaciones 24h</span><span className="kpi-value">{dashboard?.invocations24h ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Éxito 24h</span><span className="kpi-value">{dashboard?.successRate24h ?? '—'}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Eventos 24h</span><span className="kpi-value">{dashboard?.events24h ?? '—'}</span></div>
        <div className="kpi-card"><span className="kpi-label">Health Score</span><span className="kpi-value">{dashboard?.healthScore ?? '—'}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEip().then(setCenter)}>Inicializar EIP</button>
      </section>
      <section className="card">
        <h3>Componentes activos</h3>
        <p>Webhooks: {center?.webhooks.length ?? 0} · Rutas ESB: {center?.esbRoutes.length ?? 0} · Topics: {center?.topics.length ?? 0}</p>
      </section>
    </>
  );
}

export function EipApisPage() {
  const [policies, setPolicies] = useState<unknown[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    listEipPolicies().then(setPolicies);
    getEipGatewayAnalytics().then((a) => setAnalytics(a as Record<string, unknown>));
  }, []);

  return (
    <>
      <Header title="Catálogo de APIs" subtitle="API Gateway centralizado" actions={EIP_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => createEipPolicy({ policyKey: `POL-${Date.now()}`, apiKey: 'default-api', ratePerMinute: 120 }).then(() => listEipPolicies().then(setPolicies))}>Nueva política</button>
      </section>
      <section className="card">
        <h3>Políticas ({policies.length})</h3>
        <pre>{JSON.stringify(policies.slice(0, 5), null, 2)}</pre>
      </section>
      <section className="card">
        <h3>Analytics</h3>
        <pre>{JSON.stringify(analytics, null, 2)}</pre>
      </section>
    </>
  );
}

export function EipConnectorsPage() {
  const [connectors, setConnectors] = useState<unknown[]>([]);
  const [catalog, setCatalog] = useState<unknown>(null);
  useEffect(() => {
    listEipConnectors().then(setConnectors);
    getEipConnectorCatalog().then(setCatalog);
  }, []);

  return (
    <>
      <Header title="Administrador de Conectores" subtitle="REST, GraphQL, SOAP, gRPC, archivos" actions={EIP_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => registerEipConnector({ connectorKey: `CON-${Date.now()}`, name: 'REST Connector', protocol: 'rest' }).then(() => listEipConnectors().then(setConnectors))}>Registrar conector</button>
      </section>
      <section className="card"><h3>Conectores ({connectors.length})</h3><pre>{JSON.stringify(connectors.slice(0, 8), null, 2)}</pre></section>
      <section className="card"><h3>Catálogo</h3><pre>{JSON.stringify(catalog, null, 2)}</pre></section>
    </>
  );
}

export function EipWebhooksPage() {
  const [webhooks, setWebhooks] = useState<unknown[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  useEffect(() => {
    listEipWebhooks().then(setWebhooks);
    listEipWebhookHistory().then(setHistory);
  }, []);

  return (
    <>
      <Header title="Centro de Webhooks" subtitle="Entrantes y salientes" actions={EIP_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => createEipWebhook({ webhookKey: `WH-${Date.now()}`, name: 'Webhook saliente', direction: 'outgoing', targetUrl: 'https://example.com/hook' }).then(() => listEipWebhooks().then(setWebhooks))}>Crear webhook</button>
        <button className="btn" onClick={() => retryEipWebhooks().then(() => listEipWebhookHistory().then(setHistory))}>Reintentar cola</button>
      </section>
      <section className="card"><h3>Webhooks ({webhooks.length})</h3><pre>{JSON.stringify(webhooks, null, 2)}</pre></section>
      <section className="card"><h3>Historial</h3><pre>{JSON.stringify(history.slice(0, 10), null, 2)}</pre></section>
    </>
  );
}

export function EipEventsPage() {
  const [topics, setTopics] = useState<unknown[]>([]);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [dlq, setDlq] = useState<unknown[]>([]);
  useEffect(() => {
    listEipEventTopics().then(setTopics);
    listEipEventMessages().then(setMessages);
    listEipDlq().then(setDlq);
  }, []);

  return (
    <>
      <Header title="Monitor de Eventos" subtitle="Event Bus empresarial" actions={EIP_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => publishEipEvent({ topicKey: 'custom.integration', eventType: 'TestEvent', payload: { ts: Date.now() } }).then(() => listEipEventMessages().then(setMessages))}>Publicar evento</button>
      </section>
      <section className="card"><h3>Topics ({topics.length})</h3><pre>{JSON.stringify(topics, null, 2)}</pre></section>
      <section className="card"><h3>Mensajes recientes</h3><pre>{JSON.stringify(messages.slice(0, 10), null, 2)}</pre></section>
      <section className="card"><h3>Dead Letter Queue ({dlq.length})</h3><pre>{JSON.stringify(dlq.slice(0, 5), null, 2)}</pre></section>
    </>
  );
}

export function EipEsbPage() {
  const [routes, setRoutes] = useState<unknown[]>([]);
  const [messages, setMessages] = useState<unknown[]>([]);
  useEffect(() => {
    listEipEsbRoutes().then(setRoutes);
    listEipEsbMessages().then(setMessages);
  }, []);

  return (
    <>
      <Header title="Panel ESB" subtitle="Ruteo, transformación y orquestación" actions={EIP_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => createEipEsbRoute({ routeKey: `RT-${Date.now()}`, name: 'Ruta módulo', sourceType: 'module', targetType: 'event', sourceRef: 'module:test', targetRef: 'topic:custom.integration' }).then(() => listEipEsbRoutes().then(setRoutes))}>Nueva ruta</button>
      </section>
      <section className="card"><h3>Rutas ({routes.length})</h3><pre>{JSON.stringify(routes, null, 2)}</pre></section>
      <section className="card"><h3>Mensajes ESB</h3><pre>{JSON.stringify(messages.slice(0, 10), null, 2)}</pre></section>
    </>
  );
}

export function EipMessagingPage() {
  const [slots, setSlots] = useState<unknown[]>([]);
  const [providers, setProviders] = useState<unknown[]>([]);
  useEffect(() => {
    getEipMessagingSlots().then(setSlots);
    listEipMessagingProviders().then(setProviders);
  }, []);

  return (
    <>
      <Header title="Panel de Mensajería" subtitle="RabbitMQ, Kafka, Azure, AWS, GCP" actions={EIP_LINKS} />
      <section className="card"><h3>Slots disponibles</h3><pre>{JSON.stringify(slots, null, 2)}</pre></section>
      <section className="card"><h3>Proveedores configurados ({providers.length})</h3><pre>{JSON.stringify(providers, null, 2)}</pre></section>
    </>
  );
}

export function EipPerformancePage() {
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [invocations, setInvocations] = useState<unknown[]>([]);
  useEffect(() => {
    getEipMonitoringDashboard().then(setDashboard);
    listEipInvocations().then(setInvocations);
  }, []);

  return (
    <>
      <Header title="Dashboard de Rendimiento" subtitle="Monitoreo en tiempo real" actions={EIP_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Avg ms</span><span className="kpi-value">{String(dashboard?.avgDurationMs ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">ESB 24h</span><span className="kpi-value">{String(dashboard?.esbMessages24h ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">DLQ</span><span className="kpi-value">{String(dashboard?.dlqCount ?? '—')}</span></div>
      </div>
      <section className="card"><h3>Invocaciones</h3><pre>{JSON.stringify(invocations.slice(0, 15), null, 2)}</pre></section>
    </>
  );
}

export function EipErrorsPage() {
  const [errors, setErrors] = useState<unknown[]>([]);
  const [dlq, setDlq] = useState<unknown[]>([]);
  useEffect(() => {
    listEipErrors().then(setErrors);
    listEipDlq().then(setDlq);
  }, []);

  return (
    <>
      <Header title="Centro de Errores" subtitle="Errores e integraciones fallidas" actions={EIP_LINKS} />
      <section className="card"><h3>Errores de invocación ({errors.length})</h3><pre>{JSON.stringify(errors, null, 2)}</pre></section>
      <section className="card"><h3>DLQ ({dlq.length})</h3><pre>{JSON.stringify(dlq, null, 2)}</pre></section>
    </>
  );
}

export function EipRulesPage() {
  const [bindings, setBindings] = useState<unknown[]>([]);
  const [rules, setRules] = useState<unknown[]>([]);
  useEffect(() => {
    listEipBindings().then(setBindings);
    listEipBreRules('published').then(setRules);
  }, []);

  return (
    <>
      <Header title="Motor BRE — Facade EIP" subtitle="Reglas reutilizables vía EBRE" actions={EIP_LINKS} />
      <section className="card row-actions">
        <button className="btn" onClick={() => createEipBinding({ bindingKey: `BIND-${Date.now()}`, ruleKey: 'default-rule', moduleRef: 'erp', scope: 'module' }).then(() => listEipBindings().then(setBindings))}>Nuevo binding</button>
        <button className="btn" onClick={() => bridgeEipEvent({ moduleRef: 'erp', eventType: 'EipTest', payload: { ok: true } })}>Bridge evento</button>
      </section>
      <section className="card"><h3>Bindings ({bindings.length})</h3><pre>{JSON.stringify(bindings, null, 2)}</pre></section>
      <section className="card"><h3>Reglas EBRE publicadas</h3><pre>{JSON.stringify(rules.slice(0, 8), null, 2)}</pre></section>
      <section className="card">
        <button className="btn" onClick={() => {
          const first = rules[0] as { id?: string } | undefined;
          if (first?.id) simulateEipRule(first.id, { test: true }).then((r) => alert(JSON.stringify(r)));
        }}>Simular primera regla</button>
      </section>
    </>
  );
}
