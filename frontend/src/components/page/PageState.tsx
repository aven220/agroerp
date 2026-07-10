import type { ReactNode } from 'react';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ux/LoadingState';

export type PageStateVariant =
  | 'loading'
  | 'empty'
  | 'error'
  | 'forbidden'
  | 'offline'
  | 'no-results';

interface PageStateAction {
  label: string;
  onClick?: () => void;
  to?: string;
}

interface PageStateProps {
  variant: PageStateVariant;
  title?: string;
  message?: string;
  hint?: string;
  onRetry?: () => void;
  action?: PageStateAction;
  loadingVariant?: 'page' | 'table' | 'card' | 'dashboard' | 'inline';
  loadingRows?: number;
  children?: ReactNode;
}

const DEFAULTS: Record<PageStateVariant, { title: string; illustration: 'data' | 'search' | 'error' | 'permissions' | 'offline' | 'inbox' }> = {
  loading: { title: 'Cargando…', illustration: 'data' },
  empty: { title: 'Sin registros', illustration: 'inbox' },
  error: { title: 'No se pudo cargar', illustration: 'error' },
  forbidden: { title: 'Sin permisos', illustration: 'permissions' },
  offline: { title: 'Sin conexión', illustration: 'offline' },
  'no-results': { title: 'Sin resultados', illustration: 'search' },
};

export function PageState({
  variant,
  title,
  message,
  hint,
  onRetry,
  action,
  loadingVariant = 'page',
  loadingRows = 5,
  children,
}: PageStateProps) {
  if (variant === 'loading') {
    return <LoadingState variant={loadingVariant} message={message ?? title} rows={loadingRows} />;
  }

  const defaults = DEFAULTS[variant];
  const resolvedAction =
    action ??
    (onRetry ? { label: 'Reintentar', onClick: onRetry } : undefined);

  return (
    <EmptyState
      illustration={defaults.illustration}
      title={title ?? defaults.title}
      description={message}
      hint={hint}
      action={resolvedAction}
    >
      {children}
    </EmptyState>
  );
}

/** Replaces plain `<p className="muted">Sin datos</p>` in tab panels */
export function EmptyPanel({
  title = 'Sin datos',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      illustration="inbox"
      title={title}
      description={description}
    />
  );
}
