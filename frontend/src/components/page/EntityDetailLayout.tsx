import type { ReactNode } from 'react';

export interface EntityTab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface EntityDetailLayoutProps {
  tabs: EntityTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
  metadata?: ReactNode;
  className?: string;
}

/**
 * Shared entity detail chrome: metadata chips + tab nav + tab panel.
 * Pair with PageHeader / EntityHeader above.
 */
export function EntityDetailLayout({
  tabs,
  activeTab,
  onTabChange,
  children,
  metadata,
  className = '',
}: EntityDetailLayoutProps) {
  return (
    <div className={`entity-detail-layout ${className}`.trim()}>
      {metadata}
      <nav className="tab-nav entity-tabs" role="tablist" aria-label="Secciones del expediente">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            aria-selected={activeTab === tab.id}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="tab-panel entity-tab-panel" role="tabpanel">
        {children}
      </div>
    </div>
  );
}
