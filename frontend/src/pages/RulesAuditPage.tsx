import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listBreAudit, listBreExecutions, listBreRuleVersions, listBreRules, type BreRule } from '../api/bre';

export function RulesAuditPage() {
  const [executions, setExecutions] = useState<unknown[]>([]);
  const [audit, setAudit] = useState<unknown[]>([]);

  useEffect(() => {
    listBreExecutions().then(setExecutions);
    listBreAudit().then(setAudit);
  }, []);

  return (
    <>
      <Header title="Auditoría EBRE" subtitle="Ejecuciones y cambios" actions={<Link to="/reglas" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Últimas ejecuciones</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Regla</th><th>Evento</th><th>Estado</th><th>Match</th><th>ms</th><th>Fecha</th></tr></thead>
          <tbody>
            {executions.map((e) => {
              const x = e as Record<string, unknown>;
              return (
                <tr key={String(x.id)}>
                  <td>{String(x.ruleKey)}</td>
                  <td>{String(x.eventType ?? '')}</td>
                  <td>{String(x.status)}</td>
                  <td>{x.matched ? 'Sí' : 'No'}</td>
                  <td>{String(x.durationMs)}</td>
                  <td>{String(x.executedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Historial de cambios</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Acción</th><th>Detalles</th><th>Fecha</th></tr></thead>
          <tbody>
            {audit.map((a) => {
              const x = a as Record<string, unknown>;
              return (
                <tr key={String(x.id)}>
                  <td>{String(x.action)}</td>
                  <td><code>{JSON.stringify(x.details)}</code></td>
                  <td>{String(x.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function RulesVersionsPage() {
  const [rules, setRules] = useState<BreRule[]>([]);
  const [ruleId, setRuleId] = useState('');
  const [versions, setVersions] = useState<unknown[]>([]);

  useEffect(() => { listBreRules().then(setRules); }, []);
  useEffect(() => {
    if (ruleId) listBreRuleVersions(ruleId).then(setVersions);
  }, [ruleId]);

  return (
    <>
      <Header title="Versiones de reglas" subtitle="Historial versionado" actions={<Link to="/reglas" className="btn">Centro</Link>} />
      <div className="panel form-row">
        <select value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
          <option value="">Seleccionar regla...</option>
          {rules.map((r) => <option key={r.id} value={r.id}>{r.ruleKey} v{r.version}</option>)}
        </select>
      </div>
      {versions.length > 0 && (
        <section className="panel">
          <table className="data-table">
            <thead><tr><th>Versión</th><th>Changelog</th><th>Fecha</th></tr></thead>
            <tbody>
              {versions.map((v) => {
                const x = v as Record<string, unknown>;
                return (
                  <tr key={String(x.id)}>
                    <td>{String(x.version)}</td>
                    <td>{String(x.changelog ?? '')}</td>
                    <td>{String(x.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
