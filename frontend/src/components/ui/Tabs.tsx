import { useState, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ items, defaultTab, activeTab: controlled, onChange, className = '' }: TabsProps) {
  const [internal, setInternal] = useState(defaultTab ?? items[0]?.id ?? '');
  const active = controlled ?? internal;

  const select = (id: string) => {
    if (!controlled) setInternal(id);
    onChange?.(id);
  };

  const current = items.find((t) => t.id === active);

  return (
    <div className={className}>
      <div className="tabs ds-tabs" role="tablist">
        {items.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`tab ds-tab${active === tab.id ? ' active' : ''}`}
            aria-selected={active === tab.id}
            disabled={tab.disabled}
            onClick={() => select(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel">
        {current?.content}
      </div>
    </div>
  );
}
