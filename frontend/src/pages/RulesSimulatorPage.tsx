import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getBreRuleConflicts, listBreRules, simulateBreBatch, simulateBreRule, type BreRule } from '../api/bre';

export function RulesSimulatorPage() {
  const [rules, setRules] = useState<BreRule[]>([]);
  const [ruleId, setRuleId] = useState('');
  const [eventType, setEventType] = useState('ProducerCreated');
  const [payload, setPayload] = useState('{"status":"active","qualityScore":85}');
  const [result, setResult] = useState<unknown>(null);
  const [conflicts, setConflicts] = useState<unknown[]>([]);

  useEffect(() => { listBreRules('published').then(setRules); }, []);

  async function runSingle() {
    const parsed = JSON.parse(payload);
    const res = await simulateBreRule(ruleId, { eventType, payload: parsed });
    setResult(res);
    const c = await getBreRuleConflicts(ruleId);
    setConflicts(c);
  }

  async function runBatch() {
    const parsed = JSON.parse(payload);
    setResult(await simulateBreBatch(eventType, parsed));
  }

  return (
    <>
      <Header
        title="Simulador de reglas"
        subtitle="Probar antes de publicar"
        actions={<Link to="/reglas" className="btn">Centro</Link>}
      />
      <section className="panel form-row">
        <select value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
          <option value="">Regla individual...</option>
          {rules.map((r) => <option key={r.id} value={r.id}>{r.ruleKey}</option>)}
        </select>
        <input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="EventType" />
        <textarea rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={runSingle} disabled={!ruleId}>Simular regla</button>
        <button type="button" className="btn" onClick={runBatch}>Simular lote (publicadas)</button>
      </section>
      {conflicts.length > 0 && (
        <section className="panel">
          <h3>Conflictos detectados</h3>
          <pre>{JSON.stringify(conflicts, null, 2)}</pre>
        </section>
      )}
      {result && (
        <section className="panel">
          <h3>Resultado</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </>
  );
}
