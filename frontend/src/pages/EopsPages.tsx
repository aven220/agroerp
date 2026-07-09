import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  bootstrapEops,
  getEopsCenter,
  getEopsHaReadiness,
  getEopsLicenseUsage,
  getEopsMonitoring,
  getEopsObservability,
  getEopsOptimization,
  listEopsBackupRuns,
  listEopsBackupSchedules,
  listEopsDeployments,
  listEopsFeatureFlags,
  listEopsGlobalConfigs,
  listEopsHealthProbes,
  listEopsLicensePlans,
  listEopsLicenses,
  listEopsMaintenance,
  listEopsSecurityAlerts,
  listEopsSecurityPolicies,
  listEopsWorkerJobs,
  runEopsHealthCheck,
  runEopsSecurityScan,
  type EopsCenter,
} from '../api/eops';

const EOPS_LINKS = (
  <div className="row-actions">
    <Link to="/plataforma-empresarial/eops" className="btn">Centro</Link>
    <Link to="/plataforma-empresarial/eops/devops" className="btn">DevOps</Link>
    <Link to="/plataforma-empresarial/eops/observabilidad" className="btn">Observabilidad</Link>
    <Link to="/plataforma-empresarial/eops/configuracion" className="btn">Configuración</Link>
    <Link to="/plataforma-empresarial/eops/licencias" className="btn">Licencias</Link>
    <Link to="/plataforma-empresarial/eops/backups" className="btn">Backups</Link>
    <Link to="/plataforma-empresarial/eops/salud" className="btn">Salud</Link>
    <Link to="/plataforma-empresarial/eops/rendimiento" className="btn">Rendimiento</Link>
    <Link to="/plataforma-empresarial/eops/seguridad" className="btn">Seguridad</Link>
  </div>
);

export function EopsCenterPage() {
  const [center, setCenter] = useState<EopsCenter | null>(null);
  const [monitoring, setMonitoring] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEopsCenter().then(setCenter);
    getEopsMonitoring().then((m) => setMonitoring(m as Record<string, unknown>));
  }, []);
  const indicators = (monitoring?.indicators ?? center?.dashboard) as Record<string, unknown> | undefined;

  return (
    <>
      <Header title="Centro de Operaciones" subtitle="Supervisión de operaciones y servicios en tiempo real" actions={EOPS_LINKS} />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Ops Score</span><span className="kpi-value">{String(indicators?.opsScore ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Health Score</span><span className="kpi-value">{String(indicators?.healthScore ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas seguridad</span><span className="kpi-value">{String(indicators?.securityAlerts ?? '—')}</span></div>
        <div className="kpi-card"><span className="kpi-label">Producción lista</span><span className="kpi-value">{indicators?.productionReady ? 'Sí' : 'No'}</span></div>
      </div>
      <section className="card">
        <button className="btn btn-primary" onClick={() => bootstrapEops().then(setCenter)}>Configurar operaciones</button>
      </section>
      <section className="card">
        <h3>Componentes</h3>
        <p>
          Configs: {center?.globalConfigs.length ?? 0} · Flags: {center?.flags.length ?? 0} ·
          Backups: {center?.backupSchedules.length ?? 0} · Deployments: {center?.deployments.length ?? 0} ·
          Probes: {center?.probes.length ?? 0}
        </p>
      </section>
    </>
  );
}

export function EopsDevopsPage() {
  const [deployments, setDeployments] = useState<unknown[]>([]);
  const [workers, setWorkers] = useState<unknown[]>([]);
  useEffect(() => {
    listEopsDeployments().then(setDeployments);
    listEopsWorkerJobs().then(setWorkers);
  }, []);

  return (
    <>
      <Header title="Centro DevOps" subtitle="Despliegues, workers y migraciones" actions={EOPS_LINKS} />
      <section className="card">
        <h3>Despliegues ({deployments.length})</h3>
        <ul>{deployments.map((d: unknown, i) => {
          const row = d as Record<string, string>;
          return <li key={i}>{row.deploymentKey} — v{row.version} — {row.status}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Workers ({workers.length})</h3>
        <ul>{workers.slice(0, 10).map((w: unknown, i) => {
          const row = w as Record<string, string>;
          return <li key={i}>{row.jobKey} — {row.queueName} — {row.status}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EopsObservabilityPage() {
  const [obs, setObs] = useState<unknown>(null);
  useEffect(() => { getEopsObservability().then(setObs); }, []);

  return (
    <>
      <Header title="Centro de Observabilidad" subtitle="Logs, métricas, trazas y colas" actions={EOPS_LINKS} />
      <section className="card">
        <pre>{JSON.stringify(obs, null, 2).slice(0, 4000)}</pre>
      </section>
    </>
  );
}

export function EopsConfigPage() {
  const [configs, setConfigs] = useState<unknown[]>([]);
  const [flags, setFlags] = useState<unknown[]>([]);
  const [maintenance, setMaintenance] = useState<unknown[]>([]);
  useEffect(() => {
    listEopsGlobalConfigs().then(setConfigs);
    listEopsFeatureFlags().then(setFlags);
    listEopsMaintenance().then(setMaintenance);
  }, []);

  return (
    <>
      <Header title="Centro de Configuración" subtitle="Feature flags y parámetros" actions={EOPS_LINKS} />
      <section className="card">
        <h3>Configuraciones globales ({configs.length})</h3>
        <ul>{configs.map((c: unknown, i) => {
          const row = c as Record<string, string>;
          return <li key={i}>{row.configKey} — {row.category}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Feature Flags ({flags.length})</h3>
        <ul>{flags.map((f: unknown, i) => {
          const row = f as Record<string, string | boolean>;
          return <li key={i}>{row.flagKey} — {row.enabled ? 'ON' : 'OFF'} ({row.rolloutPct}%)</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Mantenimiento ({maintenance.length})</h3>
      </section>
    </>
  );
}

export function EopsLicensesPage() {
  const [plans, setPlans] = useState<unknown[]>([]);
  const [licenses, setLicenses] = useState<unknown[]>([]);
  const [usage, setUsage] = useState<unknown>(null);
  useEffect(() => {
    listEopsLicensePlans().then(setPlans);
    listEopsLicenses().then(setLicenses);
    getEopsLicenseUsage().then(setUsage);
  }, []);

  return (
    <>
      <Header title="Administrador de Licencias" subtitle="Planes, suscripciones y consumo" actions={EOPS_LINKS} />
      <section className="card">
        <h3>Uso</h3>
        <pre>{JSON.stringify(usage, null, 2)}</pre>
      </section>
      <section className="card">
        <h3>Planes ({plans.length})</h3>
        <ul>{plans.map((p: unknown, i) => {
          const row = p as Record<string, string>;
          return <li key={i}>{row.name ?? row.planKey}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Licencias ({licenses.length})</h3>
      </section>
    </>
  );
}

export function EopsBackupsPage() {
  const [schedules, setSchedules] = useState<unknown[]>([]);
  const [runs, setRuns] = useState<unknown[]>([]);
  useEffect(() => {
    listEopsBackupSchedules().then(setSchedules);
    listEopsBackupRuns().then(setRuns);
  }, []);

  return (
    <>
      <Header title="Centro de Backups" subtitle="Programación y restauración" actions={EOPS_LINKS} />
      <section className="card">
        <h3>Programaciones ({schedules.length})</h3>
        <ul>{schedules.map((s: unknown, i) => {
          const row = s as Record<string, string>;
          return <li key={i}>{row.name ?? row.scheduleKey} — {row.cron}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Ejecuciones ({runs.length})</h3>
        <ul>{runs.slice(0, 10).map((r: unknown, i) => {
          const row = r as Record<string, string>;
          return <li key={i}>{row.runKey} — {row.status} — {row.checksum}</li>;
        })}</ul>
      </section>
    </>
  );
}

export function EopsHealthPage() {
  const [probes, setProbes] = useState<unknown[]>([]);
  const [checks, setChecks] = useState<unknown>(null);
  const [ha, setHa] = useState<unknown>(null);
  useEffect(() => {
    listEopsHealthProbes().then(setProbes);
    getEopsHaReadiness().then(setHa);
  }, []);

  return (
    <>
      <Header title="Dashboard de Salud" subtitle="Health checks y alta disponibilidad" actions={EOPS_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={() => runEopsHealthCheck().then(setChecks)}>Ejecutar checks</button>
        {checks != null && <pre>{JSON.stringify(checks, null, 2).slice(0, 3000)}</pre>}
      </section>
      <section className="card">
        <h3>Probes ({probes.length})</h3>
        <table className="data-table">
          <thead><tr><th>Probe</th><th>Tipo</th><th>Estado</th><th>Latencia</th></tr></thead>
          <tbody>
            {probes.map((p: unknown, i) => {
              const row = p as Record<string, string | number>;
              return (
                <tr key={i}>
                  <td>{row.probeKey}</td>
                  <td>{row.targetType}</td>
                  <td>{row.lastStatus}</td>
                  <td>{row.lastLatencyMs ?? '—'}ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h3>HA Readiness</h3>
        <pre>{JSON.stringify(ha, null, 2)}</pre>
      </section>
    </>
  );
}

export function EopsPerformancePage() {
  const [perf, setPerf] = useState<unknown>(null);
  useEffect(() => { getEopsOptimization().then(setPerf); }, []);

  return (
    <>
      <Header title="Dashboard de Rendimiento" subtitle="Optimización vía EPOP" actions={EOPS_LINKS} />
      <section className="card">
        <pre>{JSON.stringify(perf, null, 2).slice(0, 4000)}</pre>
      </section>
    </>
  );
}

export function EopsSecurityPage() {
  const [policies, setPolicies] = useState<unknown[]>([]);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  const [scan, setScan] = useState<unknown>(null);
  useEffect(() => {
    listEopsSecurityPolicies().then(setPolicies);
    listEopsSecurityAlerts().then(setAlerts);
  }, []);

  return (
    <>
      <Header title="Dashboard de Seguridad" subtitle="Políticas, secretos y alertas" actions={EOPS_LINKS} />
      <section className="card">
        <button className="btn btn-primary" onClick={() => runEopsSecurityScan().then(setScan)}>Escanear configuración</button>
        {scan != null && <pre>{JSON.stringify(scan, null, 2)}</pre>}
      </section>
      <section className="card">
        <h3>Políticas ({policies.length})</h3>
        <ul>{policies.map((p: unknown, i) => {
          const row = p as Record<string, string>;
          return <li key={i}>{row.name} — {row.category} — {row.severity}</li>;
        })}</ul>
      </section>
      <section className="card">
        <h3>Alertas ({alerts.length})</h3>
        <ul>{alerts.slice(0, 10).map((a: unknown, i) => {
          const row = a as Record<string, string>;
          return <li key={i}>{row.title} — {row.severity}</li>;
        })}</ul>
      </section>
    </>
  );
}
