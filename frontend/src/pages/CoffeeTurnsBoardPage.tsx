import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicCoffeeTurns } from '../api/coffee';
import { useIsMounted } from '../hooks/useIsMounted';

export function CoffeeTurnsBoardPage() {
  const mounted = useIsMounted();
  const { organizationId } = useParams();
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const load = () =>
      getPublicCoffeeTurns(organizationId).then((data) => {
        if (mounted.current) setBoard(data);
      });
    load().catch(() => undefined);
    const timer = setInterval(() => load().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [organizationId, mounted]);

  const current = board?.current as Record<string, unknown> | null;
  const waiting = (board?.waiting as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="kiosk-board">
      <h1>Turnos — Recepción de café</h1>
      <div className="kiosk-board-grid">
        <div className="kiosk-panel">
          <h2>Atendiendo</h2>
          <div className="kiosk-turn">{String(current?.displayLabel ?? '—')}</div>
          <div className="kiosk-name">{String(current?.producerName ?? 'Sin llamado')}</div>
        </div>
        <div className="kiosk-panel kiosk-panel-muted">
          <h2>En espera</h2>
          <ul className="kiosk-list">
            {waiting.map((w, i) => (
              <li key={i}>
                {String(w.displayLabel)} — {String(w.producerName)}
                {w.isPreferential ? ' ★' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="kiosk-meta">Actualizado: {String(board?.updatedAt ?? '')}</p>
    </div>
  );
}
