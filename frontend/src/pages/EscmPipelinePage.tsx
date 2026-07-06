import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { changeEscmOpportunityStage, getEscmPipeline } from '../api/escm';

export function EscmPipelinePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const reload = () => getEscmPipeline().then(setData);
  useEffect(() => { reload(); }, []);

  const stages = (data?.stages as Array<Record<string, unknown>>) ?? [];
  const board = (data?.board as Record<string, Array<Record<string, unknown>>>) ?? {};

  return (
    <>
      <Header title="Pipeline comercial" subtitle="Embudo visual por etapas" actions={<Link to="/comercial/crm" className="btn">CRM</Link>} />
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
        {stages.filter((s) => !s.isArchived).map((stage) => {
          const key = String(stage.stageKey);
          const items = board[key] ?? [];
          return (
            <section key={key} className="panel" style={{ minWidth: 260, flex: '0 0 auto' }}>
              <h4>{String(stage.name)} <small>({items.length})</small></h4>
              <p style={{ fontSize: 12, opacity: 0.7 }}>Prob. {String(stage.defaultProbability)}%</p>
              {items.map((opp) => (
                <div key={String(opp.opportunityKey)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginTop: 8 }}>
                  <strong>{String(opp.title)}</strong>
                  <div style={{ fontSize: 12 }}>{String(opp.opportunityKey)}</div>
                  <div>{Number(opp.estimatedValue ?? 0).toLocaleString()} · {String(opp.probability)}%</div>
                  {!stage.isClosed ? (
                    <button
                      className="btn-link"
                      style={{ marginTop: 4 }}
                      onClick={() => {
                        const idx = stages.findIndex((s) => s.stageKey === key);
                        const next = stages[idx + 1];
                        if (next) changeEscmOpportunityStage(String(opp.opportunityKey), { stageKey: String(next.stageKey) }).then(reload);
                      }}
                    >
                      Avanzar
                    </button>
                  ) : null}
                </div>
              ))}
            </section>
          );
        })}
      </div>
      {data?.totals ? (
        <section className="panel">
          Total: {String((data.totals as Record<string, unknown>).count)} oportunidades ·
          Valor {Number((data.totals as Record<string, unknown>).value).toLocaleString()} ·
          Ponderado {Number((data.totals as Record<string, unknown>).weighted).toLocaleString()}
        </section>
      ) : null}
    </>
  );
}
