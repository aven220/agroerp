import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getAiConversation, listAiConversations } from '../api/ai';

interface ConversationRow {
  id: string;
  title?: string;
  copilotKey?: string | null;
  updatedAt: string;
}

export function AiConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getAiConversation>> | null>(null);

  useEffect(() => {
    listAiConversations().then(setConversations);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    getAiConversation(selectedId).then(setDetail);
  }, [selectedId]);

  return (
    <>
      <Header
        title="Historial de Conversaciones"
        subtitle="Auditoría y continuidad de sesiones IA"
        actions={
          <div className="row-actions">
            <Link to="/ia" className="btn">Centro IA</Link>
            <Link to="/ia/chat" className="btn btn-primary">Nueva conversación</Link>
          </div>
        }
      />

      <div className="split-layout">
        <section className="panel">
          <h3>Conversaciones</h3>
          <table className="data-table">
            <thead>
              <tr><th>Título</th><th>Copiloto</th><th>Actualizado</th><th></th></tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className={selectedId === c.id ? 'row-selected' : ''}>
                  <td>{c.title ?? 'Sin título'}</td>
                  <td>{c.copilotKey ?? 'General'}</td>
                  <td>{new Date(c.updatedAt).toLocaleString('es-CO')}</td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => setSelectedId(c.id)}>Ver</button>
                    <Link to={`/ia/chat?conversation=${c.id}`} className="btn btn-sm">Continuar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Detalle</h3>
          {!detail && <p className="muted">Seleccione una conversación</p>}
          {detail && (
            <div className="ai-chat-messages">
              {detail.messages.map((m, i) => (
                <div key={i} className={`ai-chat-bubble ai-chat-${m.role === 'user' ? 'user' : 'assistant'}`}>
                  <p>{m.content}</p>
                  {m.explainability && (
                    <div className="ai-explain">
                      <small>
                        Confianza: {(m.explainability.confidence * 100).toFixed(0)}% ·
                        {m.explainability.modelUsed} · {m.explainability.latencyMs}ms
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
