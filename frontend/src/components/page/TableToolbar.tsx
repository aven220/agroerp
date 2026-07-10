import type { ReactNode } from 'react';

interface TableToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Unified data-grid toolbar chrome.
 * Used by EnterpriseDataGrid and legacy tables.
 */
export function TableToolbar({ left, right, children, className = '' }: TableToolbarProps) {
  if (children) {
    return (
      <div className={`edw-toolbar ds-table-toolbar table-toolbar ${className}`.trim()}>
        {children}
      </div>
    );
  }

  return (
    <div className={`edw-toolbar ds-table-toolbar table-toolbar ${className}`.trim()}>
      {left ? <div className="edw-toolbar-left ds-toolbar-left">{left}</div> : null}
      {right ? <div className="edw-toolbar-right ds-toolbar-right">{right}</div> : null}
    </div>
  );
}

interface TableSearchProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
}

export function TableSearch({
  id,
  value,
  onChange,
  placeholder = 'Buscar en tabla…',
  'aria-label': ariaLabel = 'Búsqueda instantánea',
}: TableSearchProps) {
  return (
    <input
      id={id}
      type="search"
      className="edw-quick-search ds-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    />
  );
}
