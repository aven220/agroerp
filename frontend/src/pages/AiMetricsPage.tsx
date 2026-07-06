import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getAiMetrics, listAiConversations, syncAiRag } from '../api/ai';

export function AiMetricsPage() {
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getAiMetrics>> | null>(null);
  const [conversations, setConversations] = useState<Array<{ id: string; title?: string; updatedAt: string }>>([]);

  useEffect(() => {
    getAiMetrics().then(setMetrics);
    listAiConversations().then(setConversations);
  }, []);

  return (
    <>
      <Header
        title="Métricas y Costos IA"
        subtitle="Consumo · rendimiento · historial"
        actions={
          <div className="row-actions">
            <Link to="/ia" className="btn">Centro IA</Link>
            <button type="button" className="btn" onClick={() => syncAiRag().then(() => alert('RAG sincronizado'))}>Sync RAG ERP</button>
          </div>
        }
      />

      {metrics && (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card"><span className="kpi-label">24h</span><span className="kpi-value">{metrics.kpis.requests24h}</span></div>
          <div className="kpi-card"><span className="kpi-label">Mes</span><span className="kpi-value">{metrics.kpis.requestsMonth}</span></div>
          <div className="kpi-card"><span className="kpi-label">Costo mes</span><span className="kpi-value">${metrics.kpis.estimatedCostMonth.toFixed(2)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Latencia</span><span className="kpi-value">{metrics.kpis.avgLatencyMs}ms</span></div>
        </div>
      )}

      <section className="panel">
        <h3>Historial de conversaciones</h3>
        <table className="data-table">
          <thead><tr><th>Título</th><th>Actualizado</th><th></th></tr></thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id}>
                <td>{c.title ?? 'Sin título'}</td>
                <td>{new Date(c.updatedAt).toLocaleString('es-CO')}</td>
                <td><Link to={`/ia/chat?conversation=${c.id}`}>Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
