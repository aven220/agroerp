import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';
import { useMobile } from '../../context/MobileContext';

export function SyncQueueSheet() {
  const { syncOpen, setSyncOpen, queueItems, removeQueueItem, online, pendingCount } = useMobile();

  return (
    <Drawer open={syncOpen} title="Cola de sincronización" onClose={() => setSyncOpen(false)}>
      <div className="mobile-sync-sheet">
        <p className="mobile-sync-status">
          {online ? 'Conectado — la sincronización se ejecuta al enviar formularios.' : 'Sin conexión — los elementos se enviarán al reconectar.'}
        </p>
        {pendingCount === 0 ? (
          <EmptyState
            illustration="inbox"
            title="Cola vacía"
            description="No hay envíos pendientes de sincronización."
            hint="Los formularios capturados offline aparecerán aquí hasta enviarse."
          />
        ) : (
          <ul className="mobile-sync-list">
            {queueItems.map((item) => (
              <li key={item.id} className="mobile-sync-item">
                <div>
                  <strong>{item.label}</strong>
                  <span className="ds-caption">{new Date(item.updatedAt).toLocaleString('es-CO')}</span>
                </div>
                <span className={`mobile-badge mobile-badge-${item.status}`}>{item.status}</span>
                {item.status === 'synced' || item.status === 'failed' ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeQueueItem(item.id)}>
                    Quitar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
