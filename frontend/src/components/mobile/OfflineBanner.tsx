import { useMobile } from '../../context/MobileContext';

export function OfflineBanner() {
  const { online, pendingCount, setSyncOpen, isMobile, isTablet } = useMobile();

  if (!isMobile && !isTablet) return null;
  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`mobile-offline-banner${online ? ' mobile-offline-pending' : ' mobile-offline-offline'}`}
      role="status"
    >
      <span>
        {!online
          ? 'Sin conexión — trabajando offline'
          : `${pendingCount} elemento(s) pendiente(s) de sincronizar`}
      </span>
      {pendingCount > 0 ? (
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSyncOpen(true)}>
          Ver cola
        </button>
      ) : null}
    </div>
  );
}
