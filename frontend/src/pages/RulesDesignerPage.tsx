import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getBreRule, listBreRules, updateBreRule, type BreRule } from '../api/bre';

export function RulesDesignerPage() {
  const [rules, setRules] = useState<BreRule[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [json, setJson] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { listBreRules().then(setRules); }, []);

  useEffect(() => {
    if (!selectedId) return;
    getBreRule(selectedId).then((r) => {
      setJson(JSON.stringify({
        conditions: r.conditions,
        expressions: r.expressions,
        actions: r.actions,
        dependencies: r.dependencies,
        schedule: r.schedule,
      }, null, 2));
    });
  }, [selectedId]);

  async function handleSave() {
    if (!selectedId) return;
    try {
      const parsed = JSON.parse(json);
      await updateBreRule(selectedId, parsed);
      setMessage('Regla actualizada');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al guardar');
    }
  }

  return (
    <>
      <Header
        title="Diseñador visual de reglas"
        subtitle="Condiciones, expresiones y acciones"
        actions={
          <div className="row-actions">
            <Link to="/reglas/catalogo" className="btn">Catálogo</Link>
            <Link to="/reglas/simulador" className="btn">Simulador</Link>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!selectedId}>Guardar</button>
          </div>
        }
      />
      <div className="panel form-row">
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Seleccionar regla...</option>
          {rules.map((r) => <option key={r.id} value={r.id}>{r.ruleKey} — {r.name}</option>)}
        </select>
      </div>
      {message && <div className="alert">{message}</div>}
      {selectedId && (
        <section className="panel">
          <h3>Definición JSON (condiciones / expresiones / acciones)</h3>
          <textarea
            className="code-editor"
            rows={24}
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
          />
        </section>
      )}
    </>
  );
}
