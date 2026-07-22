import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ModuleIcons } from './icons';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface EmptyStateProps {
  icon?: string;
  illustration?: 'inbox' | 'search' | 'data' | 'folder' | 'error' | 'permissions' | 'offline' | 'records';
  title: string;
  description?: string;
  hint?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: ReactNode;
}

const ILLUSTRATIONS: Record<string, string> = {
  inbox: ModuleIcons.work,
  search: ModuleIcons.search,
  data: ModuleIcons.intelligence,
  folder: ModuleIcons.documents,
  error: ModuleIcons.warning,
  permissions: ModuleIcons.admin,
  offline: ModuleIcons.iot,
  records: ModuleIcons.work,
};

export function EmptyState({
  icon,
  illustration = 'inbox',
  title,
  description,
  hint,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  const displayIcon = icon ?? ILLUSTRATIONS[illustration] ?? ModuleIcons.work;

  return (
    <div className="empty-state ds-empty-state ds-empty-state-polished" role="status">
      <div className="ds-empty-illustration" aria-hidden>
        <span className="ds-empty-state-icon">{displayIcon}</span>
      </div>
      <h3 className="ds-empty-state-title">{title}</h3>
      {description ? <p className="ds-empty-state-desc">{description}</p> : null}
      {hint ? <p className="ds-empty-state-hint">{hint}</p> : null}
      <div className="ds-empty-actions">
        {action ? (
          action.to ? (
            <Link to={action.to} className={`btn btn-${action.variant ?? 'primary'}`}>{action.label}</Link>
          ) : (
            <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>{action.label}</Button>
          )
        ) : null}
        {secondaryAction ? (
          secondaryAction.to ? (
            <Link to={secondaryAction.to} className="btn btn-ghost">{secondaryAction.label}</Link>
          ) : (
            <Button variant="ghost" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
          )
        ) : null}
      </div>
      {children}
    </div>
  );
}
