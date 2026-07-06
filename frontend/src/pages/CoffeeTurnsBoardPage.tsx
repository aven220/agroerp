import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicCoffeeTurns } from '../api/coffee';

export function CoffeeTurnsBoardPage() {
  const { organizationId } = useParams();
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const load = () => getPublicCoffeeTurns(organizationId).then(setBoard);
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [organizationId]);

  const current = board?.current as Record<string, unknown> | null;
  const waiting = (board?.waiting as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: 32, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 42, marginBottom: 24 }}>Turnos — Recepción de café</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#14532d', borderRadius: 16, padding: 24 }}>
          <h2>Atendiendo</h2>
          <div style={{ fontSize: 72, fontWeight: 700 }}>{String(current?.displayLabel ?? '—')}</div>
          <div style={{ fontSize: 28 }}>{String(current?.producerName ?? 'Sin llamado')}</div>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 24 }}>
          <h2>En espera</h2>
          <ul style={{ fontSize: 28, listStyle: 'none', padding: 0 }}>
            {waiting.map((w, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {String(w.displayLabel)} — {String(w.producerName)}
                {w.isPreferential ? ' ★' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p style={{ marginTop: 24, opacity: 0.7 }}>Actualizado: {String(board?.updatedAt ?? '')}</p>
    </div>
  );
}
