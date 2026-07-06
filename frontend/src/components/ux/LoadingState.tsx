import { Skeleton } from '../ui/Skeleton';

interface LoadingStateProps {
  variant?: 'page' | 'table' | 'card' | 'dashboard' | 'inline';
  message?: string;
  rows?: number;
}

export function LoadingState({ variant = 'page', message, rows = 5 }: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className="ds-loading-inline" role="status" aria-live="polite">
        <span className="ds-spinner" aria-hidden />
        <span>{message ?? 'Cargando…'}</span>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="ds-loading-table" role="status" aria-busy="true" aria-label={message ?? 'Cargando tabla'}>
        <div className="ds-loading-table-head">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} variant="text" height={14} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="ds-loading-table-row">
            {Array.from({ length: 5 }, (_, c) => (
              <Skeleton key={c} variant="text" width={c === 0 ? '80%' : '60%'} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="ds-loading-cards" role="status" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="ds-loading-card">
            <Skeleton variant="title" width="40%" />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="70%" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="ds-loading-dashboard" role="status" aria-busy="true" aria-label="Cargando dashboard">
        <div className="ds-loading-kpi-row">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} variant="rect" height={88} />
          ))}
        </div>
        <div className="ds-loading-widget-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} variant="rect" height={160} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ds-loading-page" role="status" aria-busy="true" aria-label={message ?? 'Cargando página'}>
      <Skeleton variant="title" width={200} />
      <Skeleton variant="text" width="60%" />
      <div className="ds-loading-page-body">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} variant="text" width={i === rows - 1 ? '45%' : '100%'} />
        ))}
      </div>
    </div>
  );
}

export function ModuleLoadingFallback() {
  return <LoadingState variant="page" message="Cargando módulo…" />;
}

export function PageLoader({ message = 'Cargando…' }: { message?: string }) {
  return (
    <div className="loading-screen ds-page-loader">
      <span className="ds-spinner ds-spinner-lg" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
