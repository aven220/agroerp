import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listAiCopilots, type AiCopilot } from '../api/ai';

const CATEGORY_LABELS: Record<string, string> = {
  management: 'Gerencia',
  purchases: 'Compras',
  finance: 'Finanzas',
  inventory: 'Inventario',
  quality: 'Calidad',
  laboratory: 'Laboratorio',
  producers: 'Productores',
  field_technician: 'Técnicos de campo',
  logistics: 'Logística',
  hr: 'Recursos Humanos',
  system_admin: 'Administradores',
};

export function AiCopilotsPage() {
  const [copilots, setCopilots] = useState<AiCopilot[]>([]);
  useEffect(() => { listAiCopilots().then(setCopilots); }, []);

  return (
    <>
      <Header title="Panel de Copilotos" subtitle="Asistentes especializados por dominio" actions={
        <div className="row-actions">
          <Link to="/ia" className="btn">Centro IA</Link>
          <Link to="/ia/chat" className="btn btn-primary">Abrir chat</Link>
        </div>
      } />

      <div className="bi-category-grid">
        {copilots.map((c) => (
          <Link key={c.id} to={`/ia/chat?copilot=${c.copilotKey}`} className="bi-category-card">
            <strong>{c.name}</strong>
            <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>
            <small>{c.copilotKey}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
