import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { aiChat, getAiConversation, listAiCopilots, type AiChatResponse, type AiCopilot } from '../api/ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  explainability?: AiChatResponse['explainability'];
}

export function AiChatPage() {
  const [searchParams] = useSearchParams();
  const [copilots, setCopilots] = useState<AiCopilot[]>([]);
  const [copilotKey, setCopilotKey] = useState(searchParams.get('copilot') ?? '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(searchParams.get('conversation') ?? undefined);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listAiCopilots().then(setCopilots); }, []);

  useEffect(() => {
    const convId = searchParams.get('conversation');
    if (!convId) return;
    setConversationId(convId);
    getAiConversation(convId).then((conv) => {
      setMessages(conv.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        explainability: m.explainability,
      })));
    });
  }, [searchParams]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: prompt }]);
    setLoading(true);
    try {
      const res = await aiChat({ prompt, copilotKey: copilotKey || undefined, conversationId, useRag: true });
      if (res.conversationId) setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: res.content, explainability: res.explainability }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Asistente IA"
        subtitle="Conversación con RAG empresarial"
        actions={<Link to="/ia" className="btn">Centro IA</Link>}
      />

      <div className="ai-chat-layout">
        <aside className="panel ai-chat-sidebar">
          <label>
            Copiloto
            <select value={copilotKey} onChange={(e) => setCopilotKey(e.target.value)}>
              <option value="">General</option>
              {copilots.map((c) => (
                <option key={c.copilotKey} value={c.copilotKey}>{c.name}</option>
              ))}
            </select>
          </label>
        </aside>

        <main className="panel ai-chat-main">
          <div className="ai-chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-bubble ai-chat-${m.role}`}>
                <p>{m.content}</p>
                {m.explainability && (
                  <div className="ai-explain">
                    <small>
                      Confianza: {(m.explainability.confidence * 100).toFixed(0)}% ·
                      Modelo: {m.explainability.modelUsed} ·
                      {m.explainability.latencyMs}ms ·
                      RAG: {m.explainability.ragUsed ? 'sí' : 'no'}
                    </small>
                    {m.explainability.sources.length > 0 && (
                      <ul>
                        {m.explainability.sources.map((s, j) => (
                          <li key={j}>{s.title ?? s.ref} ({s.type})</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="ai-chat-bubble ai-chat-assistant">Procesando...</div>}
            <div ref={endRef} />
          </div>
          <div className="ai-chat-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escriba su consulta..."
              rows={2}
            />
            <button type="button" className="btn btn-primary" onClick={send} disabled={loading}>Enviar</button>
          </div>
        </main>
      </div>
    </>
  );
}
